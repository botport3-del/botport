import 'server-only';
import { prisma, type Backup } from 'db';
import { createRest, createSnapshot, restoreSnapshot, type GuildSnapshot } from 'core';
import { env } from './env';

export class BackupError extends Error {}

/** Human-readable summary of a stored snapshot for dashboard display. */
export function summarizeSnapshot(data: unknown): {
  roles: number;
  channels: number;
  serverName: string | null;
} {
  const snap = data as Partial<GuildSnapshot> | null;
  return {
    roles: snap?.roles?.length ?? 0,
    channels: snap?.channels?.length ?? 0,
    serverName: snap?.server?.name ?? null,
  };
}

function requireBotToken(): string {
  if (!env.discordBotToken) {
    throw new BackupError(
      'No bot token configured. Set DISCORD_BOT_TOKEN and invite the bot to create live backups.',
    );
  }
  return env.discordBotToken;
}

/** Creates a fresh snapshot of the guild and persists it. */
export async function createGuildBackup(
  guildId: string,
  opts: { type?: 'MANUAL' | 'SCHEDULED'; label?: string; createdBy?: string } = {},
): Promise<Backup> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) throw new BackupError('Guild not found.');

  const rest = createRest(requireBotToken());
  const snapshot = await createSnapshot(rest, guild.discordId);

  return prisma.backup.create({
    data: {
      guildId: guild.id,
      type: opts.type ?? 'MANUAL',
      label: opts.label ?? `Backup ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      createdBy: opts.createdBy,
      data: snapshot as unknown as object,
    },
  });
}

/** Restores a stored backup back onto its guild. */
export async function restoreGuildBackup(backupId: string) {
  const backup = await prisma.backup.findUnique({
    where: { id: backupId },
    include: { guild: true },
  });
  if (!backup) throw new BackupError('Backup not found.');

  const rest = createRest(requireBotToken());
  return restoreSnapshot(rest, backup.guild.discordId, backup.data as unknown as GuildSnapshot);
}
