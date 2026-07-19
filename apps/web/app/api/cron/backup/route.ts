import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db';
import { createRest } from 'core';
import { env } from '@/lib/env';
import { createGuildBackup } from '@/lib/backups';

/**
 * Scheduled backups (Vercel Cron). There's no live gateway connection here,
 * so guild membership is checked via the REST "current user guilds"
 * endpoint rather than a client cache.
 *
 * Vercel's Hobby plan only allows daily cron runs, so both HOURLY and DAILY
 * guilds are backed up once per invocation - HOURLY effectively degrades to
 * "at least once a day" until this is upgraded to a paid plan/host with a
 * finer-grained scheduler.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (!env.discordBotToken) {
    return NextResponse.json({ ok: false, message: 'No bot token configured.' }, { status: 200 });
  }

  const rest = createRest(env.discordBotToken);
  const botGuilds = await rest.get<{ id: string }[]>('/users/@me/guilds');
  const botGuildIds = new Set(botGuilds.map((g) => g.id));

  const guilds = await prisma.guild.findMany({
    where: { settings: { backupSchedule: { in: ['HOURLY', 'DAILY'] } } },
  });

  let done = 0;
  let skipped = 0;
  for (const guild of guilds) {
    if (!botGuildIds.has(guild.discordId)) {
      skipped++;
      continue;
    }
    try {
      await createGuildBackup(guild.id, { type: 'SCHEDULED' });
      done++;
    } catch (e) {
      console.error(`[cron] backup failed for ${guild.discordId}:`, e);
    }
  }

  return NextResponse.json({ ok: true, done, skipped, total: guilds.length });
}
