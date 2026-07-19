import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { env } from '@/lib/env';
import { getBaseUrl } from '@/lib/base-url';
import { verifyVerifyToken } from '@/lib/verify-token';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Redirects the member into Discord's official OAuth consent screen for the
 * verify flow. Scopes: identify (to know who verified) and guilds.join (so the
 * owner can later re-add the member to their new server on Devorju). Discord
 * displays these scopes to the member on their own consent page before we ever
 * receive a token.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });

  const payload = await verifyVerifyToken(token);
  if (!payload) return NextResponse.json({ error: 'invalid token' }, { status: 400 });

  const base = await getBaseUrl();
  const state = randomBytes(16).toString('hex');
  const store = await cookies();
  store.set('bp_verify_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  store.set('bp_verify_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: env.discordClientId,
    redirect_uri: `${base}/api/verify/oauth-callback`,
    response_type: 'code',
    // guilds.join lets the owner later re-add the member to another server they run.
    // Discord shows this scope explicitly on the consent screen.
    scope: 'identify guilds.join',
    state,
    prompt: 'consent',
  });
  return NextResponse.redirect(`${DISCORD_API}/oauth2/authorize?${params.toString()}`);
}
