import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createRest } from 'core';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!env.cronSecret || secret !== env.cronSecret) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const checks: Record<string, unknown> = {
    hasDiscordBotToken: Boolean(env.discordBotToken),
    hasDiscordClientId: Boolean(env.discordClientId),
    hasDiscordPublicKey: Boolean(env.discordPublicKey),
    hasCronSecret: Boolean(env.cronSecret),
    hasAppBaseUrl: env.appBaseUrl,
    codeVersion: 'guild-sync-v2',
  };

  if (env.discordBotToken) {
    try {
      const rest = createRest(env.discordBotToken);
      const guilds = await rest.get<{ id: string; name: string }[]>('/users/@me/guilds');
      checks.botGuilds = guilds.map((g) => ({ id: g.id, name: g.name }));
    } catch (e) {
      checks.botGuildsError = String(e);
    }
  }

  return NextResponse.json(checks);
}
