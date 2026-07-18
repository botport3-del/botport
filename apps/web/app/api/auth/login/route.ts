import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { env } from '@/lib/env';
import { buildAuthorizeUrl } from '@/lib/discord';

export async function GET() {
  // Local development without Discord credentials: use the dev login shortcut.
  if (env.devLoginEnabled) {
    return NextResponse.redirect(`${env.appBaseUrl}/api/auth/dev-login`);
  }

  const state = randomBytes(16).toString('hex');
  const store = await cookies();
  store.set('bp_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
