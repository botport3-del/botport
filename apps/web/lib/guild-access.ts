import 'server-only';
import { notFound } from 'next/navigation';
import { prisma, type Guild, type GuildSettings, type StaffRole } from 'db';

export type GuildWithSettings = Guild & { settings: GuildSettings | null };

export type EffectiveRole = StaffRole | null;

/** Resolves a user's effective role in a guild: OWNER, ADMIN, MOD or null. */
export async function getEffectiveRole(userId: string, guildId: string): Promise<EffectiveRole> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) return null;
  if (guild.ownerUserId === userId) return 'OWNER';
  const staff = await prisma.staffMember.findFirst({ where: { guildId, userId } });
  return staff?.role ?? null;
}

/** Ensures the user can manage the guild (OWNER or ADMIN); otherwise notFound(). */
export async function requireGuildManage(userId: string, guildId: string): Promise<EffectiveRole> {
  const role = await getEffectiveRole(userId, guildId);
  if (role !== 'OWNER' && role !== 'ADMIN') notFound();
  return role;
}

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
