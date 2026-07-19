import 'server-only';
import { headers } from 'next/headers';
import { env } from './env';

/**
 * Resolves the app's public base URL.
 *
 * Prefers the incoming request's host (so the deployment works on any domain
 * without configuring APP_BASE_URL), and falls back to the env value, then
 * localhost for local dev.
 */
export async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // headers() unavailable (e.g. outside a request) — fall through
  }
  return env.appBaseUrl;
}
