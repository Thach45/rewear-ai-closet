import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * For cloud deploys where JSON key is stored in env secret:
 * - reads GOOGLE_APPLICATION_CREDENTIALS_JSON
 * - writes a temp credentials file
 * - sets GOOGLE_APPLICATION_CREDENTIALS for Google SDKs
 */
export function bootstrapGoogleCredentialsFromEnv(): void {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw || raw.trim().length === 0) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON: not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON: expected JSON object');
  }

  const tmpPath = path.join(os.tmpdir(), 'rewear-gcp-sa.json');
  fs.writeFileSync(tmpPath, JSON.stringify(parsed), { mode: 0o600 });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
}
