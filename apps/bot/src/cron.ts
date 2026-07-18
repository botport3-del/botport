import cron from 'node-cron';
import type { Client } from 'discord.js';
import { prisma } from 'db';
import { backupGuild } from './lib/backup-service.js';
import { env } from './env.js';

/**
 * Runs scheduled backups for guilds whose settings request them.
 * HOURLY guilds are backed up every hour; DAILY guilds once a day at 04:00.
 * Only guilds the bot is actually a member of are processed.
 */
export function startBackupScheduler(client: Client): void {
  const run = async (schedule: 'HOURLY' | 'DAILY') => {
    const guilds = await prisma.guild.findMany({
      where: { settings: { backupSchedule: schedule } },
    });
    for (const guild of guilds) {
      const live = client.guilds.cache.get(guild.discordId);
      if (!live) continue;
      try {
        await backupGuild(env.botToken!, guild.discordId, live.name, { type: 'SCHEDULED' });
        console.log(`[cron] ${schedule} backup done for ${live.name}`);
      } catch (e) {
        console.error(`[cron] backup failed for ${guild.discordId}:`, e);
      }
    }
  };

  cron.schedule('0 * * * *', () => void run('HOURLY'));
  cron.schedule('0 4 * * *', () => void run('DAILY'));
  console.log('[bot] Backup scheduler started (hourly + daily).');
}
