import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { env } from './env';

/**
 * Symmetric AES-256-GCM encryption for at-rest secrets (Discord OAuth refresh
 * tokens etc.). Keyed by SHA-256(AUTH_SECRET) so rotating AUTH_SECRET
 * invalidates all stored tokens intentionally.
 */
function key(): Buffer {
  return createHash('sha256').update(env.authSecret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function decryptSecret(cipherText: string): string | null {
  try {
    const buf = Buffer.from(cipherText, 'base64url');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
