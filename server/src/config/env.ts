import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Find .env file from current directory or parent directory
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

function resolveFilePath(envVal?: string, fallback: string = ''): string {
  const target = envVal || fallback;
  if (!target) return '';
  if (path.isAbsolute(target)) return target;

  const candidates = [
    path.resolve(process.cwd(), target),
    path.resolve(process.cwd(), '..', target),
    path.resolve(import.meta.dirname, '..', '..', '..', target),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(process.cwd(), target);
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  trueMarketsBaseUrl: process.env.TRUE_MARKETS_BASE_URL || 'https://api.truemarkets.co',
  orgKeyFilePath: resolveFilePath(process.env.TRUE_MARKETS_ORG_KEY_FILE, 'truemarkets-org-api.json'),
  signerKeyFilePath: resolveFilePath(process.env.TRUE_MARKETS_SIGNER_KEY_FILE, 'test-signer-key.json'),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};

