import 'server-only';
import { notFound } from 'next/navigation';
import { prisma, type Guild, type GuildSettings } from 'db';

export type GuildWithSettings = Guild & { settings: GuildSettings | null };

/**
 * Loads a guild the given user may access (owner or staff member).
 * Calls notFound() if it does not exist or the user has no access.
 */
export async function requireGuildAccess(
  userId: string,
  guildId: string,
): Promise<GuildWithSettings> {
  const guild = await prisma.guild.findFirst({
    where: {
      id: guildId,
      OR: [{ ownerUserId: userId }, { staff: { some: { userId } } }],
    },
    include: { settings: true },
  });
  if (!guild) notFound();
  return guild;
}
