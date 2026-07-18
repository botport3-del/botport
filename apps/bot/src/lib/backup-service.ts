import { prisma } from 'db';
import { createRest, createSnapshot, restoreSnapshot, type GuildSnapshot } from 'core';

/**
 * Ensures a Guild row exists for a Discord guild the bot is operating in.
 * The dashboard normally creates these, but the bot may act first (e.g. a
 * /backup issued right after joining), so upsert defensively.
 */
async function ensureGuild(discordGuildId: string, name: string) {
  const existing = await prisma.guild.findUnique({ where: { discordId: discordGuildId } });
  if (existing) return existing;

  // Fall back to a system owner if the guild isn't linked to a dashboard user yet.
  const owner = await prisma.user.upsert({
    where: { discordId: `system:${discordGuildId}` },
    update: {},
    create: { discordId: `system:${discordGuildId}`, username: 'unclaimed' },
  });
  return prisma.guild.create({
    data: { discordId: discordGuildId, name, ownerUserId: owner.id },
  });
}

export async function backupGuild(
  botToken: string,
  discordGuildId: string,
  guildName: string,
  opts: { type?: 'MANUAL' | 'SCHEDULED'; createdBy?: string } = {},
) {
  const guild = await ensureGuild(discordGuildId, guildName);
  const rest = createRest(botToken);
  const snapshot = await createSnapshot(rest, discordGuildId);

  return prisma.backup.create({
    data: {
      guildId: guild.id,
      type: opts.type ?? 'MANUAL',
      label: `Backup ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      createdBy: opts.createdBy,
      data: snapshot as unknown as object,
    },
  });
}

export async function restoreLatest(botToken: string, discordGuildId: string) {
  const guild = await prisma.guild.findUnique({ where: { discordId: discordGuildId } });
  if (!guild) return null;
  const backup = await prisma.backup.findFirst({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!backup) return null;

  const rest = createRest(botToken);
  const result = await restoreSnapshot(
    rest,
    discordGuildId,
    backup.data as unknown as GuildSnapshot,
  );
  return { backup, result };
}
