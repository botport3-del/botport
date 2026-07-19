import { createPublicKey, verify } from 'node:crypto';

/**
 * Verifies a Discord Interactions Endpoint request.
 * Discord signs `timestamp + rawBody` with Ed25519; the app's public key
 * (from the Developer Portal, not the OAuth client secret) checks it.
 */
export function verifyDiscordRequest(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  rawBody: string,
): boolean {
  try {
    const publicKey = createPublicKey({
      key: {
        kty: 'OKP',
        crv: 'Ed25519',
        x: Buffer.from(publicKeyHex, 'hex').toString('base64url'),
      },
      format: 'jwk',
    });
    const signature = Buffer.from(signatureHex, 'hex');
    const message = Buffer.from(timestamp + rawBody, 'utf8');
    return verify(null, message, publicKey, signature);
  } catch {
    return false;
  }
}
