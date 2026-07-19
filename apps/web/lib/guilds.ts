import 'server-only';
import { prisma, type Guild } from 'db';
import { createRest } from 'core';
import { getSession } from './session';
import { env } from './env';
import { fetchManageableGuilds, guildIconUrl, type DiscordGuildSummary } from './discord';

/**
 * Guilds connected to Devorju that the current user owns.
 *
 * In serverless mode there is no gateway `guildCreate` event, so guild rows
 * may not exist yet even though the bot has already joined. This function
 * auto-creates missing rows by cross-referencing the user's manageable
 * guilds (OAuth) with the bot's guild membership (REST).
 */
export async function getConnectedGuilds(userId: string): Promise<Guild[]> {
  const session = await getSession();

  if (session?.accessToken && env.discordBotToken) {
    try {
      const [manageable, botGuilds] = await Promise.all([
        fetchManageableGuilds(session.accessToken),
        createRest(env.discordBotToken).get<{ id: string; name: string; icon: string | null }[]>(
          '/users/@me/guilds',
        ),
      ]);

      const botGuildMap = new Map(botGuilds.map((g) => [g.id, g]));
      const existing = await prisma.guild.findMany({
        where: { ownerUserId: userId },
        select: { discordId: true },
      });
      const existingIds = new Set(existing.map((g) => g.discordId));

      const toCreate = manageable.filter(
        (g) => botGuildMap.has(g.id) && !existingIds.has(g.id),
      );

      for (const g of toCreate) {
        const bot = botGuildMap.get(g.id)!;
        await prisma.guild.upsert({
          where: { discordId: g.id },
          update: { ownerUserId: userId, name: bot.name, iconUrl: guildIconUrl(g.id, bot.icon) },
          create: {
            discordId: g.id,
            name: bot.name,
            iconUrl: guildIconUrl(g.id, bot.icon),
            ownerUserId: userId,
          },
        });
      }
    } catch (e) {
      console.error('[guilds] sync failed:', e);
    }
  }

  return prisma.guild.findMany({
    where: { ownerUserId: userId },
    orderBy: { connectedAt: 'desc' },
  });
}

/**
 * Discord guilds the user can manage that are NOT yet connected to Devorju.
 * Requires a stored OAuth access token; returns [] otherwise (e.g. dev login).
 */
export async function getConnectableGuilds(
  connected: Guild[],
): Promise<DiscordGuildSummary[]> {
  const session = await getSession();
  if (!session?.accessToken) return [];
  try {
    const manageable = await fetchManageableGuilds(session.accessToken);
    const connectedIds = new Set(connected.map((g) => g.discordId));
    return manageable.filter((g) => !connectedIds.has(g.id));
  } catch {
    return [];
  }
}
