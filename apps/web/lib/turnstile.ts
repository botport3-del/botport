import { env } from './env';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Validates a Cloudflare Turnstile token server-side.
 * If no secret is configured we treat verification as passed so local
 * development without Turnstile keys still works.
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  if (!env.turnstileSecretKey) return true; // dev fallback
  if (!token) return false;

  const body = new URLSearchParams({ secret: env.turnstileSecretKey, response: token });
  if (ip) body.set('remoteip', ip);

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
