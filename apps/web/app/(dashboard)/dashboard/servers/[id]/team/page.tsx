import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess, getEffectiveRole } from '@/lib/guild-access';
import { TeamPanel, type StaffView } from './team-panel';

export const dynamic = 'force-dynamic';

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);
  const role = await getEffectiveRole(user.id, guild.id);
  const canManage = role === 'OWNER' || role === 'ADMIN';

  const [owner, staff] = await Promise.all([
    prisma.user.findUnique({ where: { id: guild.ownerUserId } }),
    prisma.staffMember.findMany({
      where: { guildId: guild.id },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const rows: StaffView[] = [
    {
      id: `owner-${guild.ownerUserId}`,
      label: owner ? (owner.globalName || owner.username) : 'Owner',
      role: 'OWNER',
      isOwner: true,
    },
    ...staff
      // avoid listing the owner twice if they also have a staff row
      .filter((s) => s.userId !== guild.ownerUserId)
      .map((s) => ({
        id: s.id,
        label: s.user ? s.user.globalName || s.user.username : (s.email ?? 'Invited'),
        role: s.role,
        isOwner: false,
      })),
  ];

  return <TeamPanel guildId={guild.id} staff={rows} canManage={canManage} />;
}
