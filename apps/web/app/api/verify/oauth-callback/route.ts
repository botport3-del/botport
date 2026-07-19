import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from 'db';
import { env } from '@/lib/env';
import { getBaseUrl } from '@/lib/base-url';
import { verifyVerifyToken } from '@/lib/verify-token';
import { encryptSecret } from '@/lib/crypto';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * OAuth callback for the verify flow. Exchanges the code for a refresh_token,
 * records the verification with `guilds.join` consent, then redirects the
 * member back to the verify page's success view.
 */
export async function GET(req: NextRequest) {
  const base = await getBaseUrl();
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const store = await cookies();
  const expectedState = store.get('bp_verify_state')?.value;
  const verifyToken = store.get('bp_verify_token')?.value;
  store.delete('bp_verify_state');
  store.delete('bp_verify_token');

  if (!code || !state || !expectedState || state !== expectedState || !verifyToken) {
    return NextResponse.redirect(`${base}/verify/error?reason=state`);
  }
  const payload = await verifyVerifyToken(verifyToken);
  if (!payload) return NextResponse.redirect(`${base}/verify/error?reason=token`);

  // Exchange code for tokens
  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.discordClientId,
      client_secret: env.discordClientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${base}/api/verify/oauth-callback`,
    }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(`${base}/verify/error?reason=exchange`);
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    scope: string;
  };

  // Fetch user identity
  const userRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return NextResponse.redirect(`${base}/verify/error?reason=user`);
  const user = (await userRes.json()) as { id: string; username: string };

  const grantedJoin = tokens.scope.split(' ').includes('guilds.join');
  const encryptedRefresh = grantedJoin ? encryptSecret(tokens.refresh_token) : null;

  await prisma.verification.create({
    data: {
      guildId: payload.guildId,
      discordId: user.id,
      username: user.username,
      status: 'PASSED',
      method: 'oauth',
      consentGiven: true,
      oauthRefreshToken: encryptedRefresh,
      oauthConsentAt: grantedJoin ? new Date() : null,
      completedAt: new Date(),
    },
  });

  return NextResponse.redirect(`${base}/verify/${payload.guildId}/success`);
}
