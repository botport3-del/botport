import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { commandDefinitions } from '@/lib/discord/command-definitions';

/**
 * One-time/idempotent setup endpoint: registers the global slash commands
 * with Discord. Meant to be opened once in a browser after deploy (visiting
 * the URL with ?secret=<CRON_SECRET>) since there's no persistent bot
 * process to run the equivalent script from.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!env.cronSecret || secret !== env.cronSecret) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (!env.discordBotToken || !env.discordClientId) {
    return NextResponse.json({ ok: false, message: 'Bot token/client id not configured.' }, { status: 200 });
  }

  const res = await fetch(`https://discord.com/api/v10/applications/${env.discordClientId}/commands`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${env.discordBotToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commandDefinitions),
  });
  const body = await res.json().catch(() => null);
  return NextResponse.json({ ok: res.ok, status: res.status, registered: body }, { status: res.ok ? 200 : 500 });
}
