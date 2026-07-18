import 'server-only';
import { prisma, type Guild } from 'db';
import { getSession } from './session';
import { fetchManageableGuilds, type DiscordGuildSummary } from './discord';

/** Guilds already connected to Botport that the current user owns. */
export async function getConnectedGuilds(userId: string): Promise<Guild[]> {
  return prisma.guild.findMany({
    where: { ownerUserId: userId },
    orderBy: { connectedAt: 'desc' },
  });
}

/**
 * Discord guilds the user can manage that are NOT yet connected to Botport.
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
