import fs from 'node:fs';
import crypto from 'node:crypto';
import { config } from '../config/env.js';
import type { OrgApiKeyFile, GatewayAuthResponse, DecodedOrgTokenPayload } from './types.js';

interface CachedToken {
  accessToken: string;
  expiresAt: number; // unix timestamp in ms
  organizationId: string;
}

let cachedToken: CachedToken | null = null;
let orgKeyData: OrgApiKeyFile | null = null;

export function loadOrgKey(): OrgApiKeyFile {
  if (orgKeyData) return orgKeyData;

  if (!fs.existsSync(config.orgKeyFilePath)) {
    throw new Error(`True Markets organization key file not found at: ${config.orgKeyFilePath}`);
  }

  const raw = fs.readFileSync(config.orgKeyFilePath, 'utf8');
  orgKeyData = JSON.parse(raw) as OrgApiKeyFile;

  if (!orgKeyData.key_id || !orgKeyData.private_key) {
    throw new Error('Invalid org API key file: missing key_id or private_key');
  }

  return orgKeyData;
}

export function decodeTokenPayload(token: string): DecodedOrgTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const jsonStr = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(jsonStr) as DecodedOrgTokenPayload;
}

/**
 * Mint a new organization access token from True Markets Gateway
 * using ECDSA P-256 (ES256) signature.
 */
export async function mintOrgToken(): Promise<CachedToken> {
  const orgKey = loadOrgKey();

  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${orgKey.key_id}.${timestamp}`;

  const privateKey = crypto.createPrivateKey({
    key: orgKey.private_key,
    format: 'jwk',
  });

  const sign = crypto.createSign('SHA256');
  sign.update(message);
  sign.end();

  // ES256 raw 64-byte signature r||s encoded as base64url without padding
  const signature = sign.sign({
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');

  const authUrl = `${config.trueMarketsBaseUrl}/v1/auth/api-key/token`;

  let response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key_id: orgKey.key_id,
      timestamp,
      signature,
    }),
  });

  // Handle potential clock skew with a retry
  if (!response.ok && response.status === 400) {
    const errText = await response.text();
    if (errText.includes('timestamp') || errText.includes('skew')) {
      const retryTimestamp = Math.floor(Date.now() / 1000);
      const retryMessage = `${orgKey.key_id}.${retryTimestamp}`;
      const retrySign = crypto.createSign('SHA256');
      retrySign.update(retryMessage);
      retrySign.end();
      const retrySig = retrySign.sign({
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url');

      response = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_id: orgKey.key_id,
          timestamp: retryTimestamp,
          signature: retrySig,
        }),
      });
    } else {
      throw new Error(`True Markets Auth failed (${response.status}): ${errText}`);
    }
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`True Markets Auth failed (${response.status}): ${errText}`);
  }

  const authData = (await response.json()) as GatewayAuthResponse;
  const decoded = decodeTokenPayload(authData.access_token);
  const organizationId = decoded.tm?.organization_id || decoded.sub.replace('organization:', '');

  // Org JWT lasts for 1 hour. Set cache TTL to 55 minutes to be safe.
  const expiresAt = Date.now() + 55 * 60 * 1000;

  cachedToken = {
    accessToken: authData.access_token,
    expiresAt,
    organizationId,
  };

  return cachedToken;
}

/**
 * Return a valid organization access token, auto-refreshing if expired or within 2 minutes of expiry.
 */
export async function getOrgToken(): Promise<string> {
  const marginMs = 2 * 60 * 1000; // 2 minutes
  if (!cachedToken || Date.now() >= cachedToken.expiresAt - marginMs) {
    await mintOrgToken();
  }
  return cachedToken!.accessToken;
}

/**
 * Return the organization ID from the authenticated token
 */
export async function getOrganizationId(): Promise<string> {
  if (!cachedToken) {
    await mintOrgToken();
  }
  return cachedToken!.organizationId;
}

