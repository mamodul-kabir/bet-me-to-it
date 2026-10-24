import fs from 'node:fs';
import { ApiKeyStamper } from '@turnkey/api-key-stamper';
import { config } from '../config/env.js';
import type { SignerKeyFile, GatewayPayload } from './types.js';

let signerKeyData: SignerKeyFile | null = null;
let stamperInstance: ApiKeyStamper | null = null;

export function loadSignerKey(): SignerKeyFile {
  if (signerKeyData) return signerKeyData;

  if (!fs.existsSync(config.signerKeyFilePath)) {
    throw new Error(`Signer key file not found at: ${config.signerKeyFilePath}`);
  }

  const raw = fs.readFileSync(config.signerKeyFilePath, 'utf8');
  signerKeyData = JSON.parse(raw) as SignerKeyFile;

  if (!signerKeyData.signer_private_key || !signerKeyData.signer_public_key) {
    throw new Error('Invalid signer key file: missing signer_private_key or signer_public_key');
  }

  return signerKeyData;
}

export function getStamper(): ApiKeyStamper {
  if (stamperInstance) return stamperInstance;

  const key = loadSignerKey();
  stamperInstance = new ApiKeyStamper({
    apiPublicKey: key.signer_public_key,
    apiPrivateKey: key.signer_private_key,
  });

  return stamperInstance;
}

/**
 * Sign a single payload string using the user's signer key (ES256 P-256 via ApiKeyStamper).
 * Returns the base64url-encoded stamp value expected by True Markets Gateway.
 */
export async function signPayload(payload: string): Promise<string> {
  const stamper = getStamper();
  const stamp = await stamper.stamp(payload);
  return stamp.stampHeaderValue;
}

/**
 * Sign an array of payloads returned from Gateway order or transfer endpoints.
 */
export async function signPayloads(payloads: (string | GatewayPayload)[]): Promise<string[]> {
  const stamper = getStamper();

  const results: string[] = [];
  for (const item of payloads) {
    const rawPayload = typeof item === 'string' ? item : item.payload;
    const stamp = await stamper.stamp(rawPayload);
    results.push(stamp.stampHeaderValue);
  }

  return results;
}

export function getSignerExternalRefId(): string {
  const key = loadSignerKey();
  return key.external_ref_id || 'admin';
}

export function getSignerPublicKey(): string {
  const key = loadSignerKey();
  return key.signer_public_key;
}

