import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from 'db';
import { env } from '@/lib/env';
import { exchangeCode, fetchDiscordUser } from '@/lib/discord';
import { createSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const store = await cookies();
  const expectedState = store.get('bp_oauth_state')?.value;
  store.delete('bp_oauth_state');

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${env.appBaseUrl}/login?error=oauth_state`);
  }

  try {
    const { access_token } = await exchangeCode(code);
    const discordUser = await fetchDiscordUser(access_token);

    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: {
        username: discordUser.username,
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        email: discordUser.email,
      },
      create: {
        discordId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        email: discordUser.email,
      },
    });

    await createSession({
      userId: user.id,
      discordId: user.discordId,
      accessToken: access_token,
    });

    return NextResponse.redirect(`${env.appBaseUrl}/dashboard`);
  } catch (err) {
    console.error('[auth] callback failed', err);
    return NextResponse.redirect(`${env.appBaseUrl}/login?error=oauth_failed`);
  }
}
