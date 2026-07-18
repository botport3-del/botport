import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess, getEffectiveRole } from '@/lib/guild-access';
import { SettingsPanel, type BlacklistView } from './settings-panel';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);
  const role = await getEffectiveRole(user.id, guild.id);
  const canManage = role === 'OWNER' || role === 'ADMIN';

  const blacklist = await prisma.blacklistEntry.findMany({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
  });

  const rows: BlacklistView[] = blacklist.map((b) => ({
    id: b.id,
    discordId: b.discordId,
    reason: b.reason,
  }));

  return (
    <SettingsPanel
      guildId={guild.id}
      backupSchedule={guild.settings?.backupSchedule ?? 'DAILY'}
      blockKnownVpns={guild.settings?.blockKnownVpns ?? false}
      joinRateLimit={guild.settings?.joinRateLimit ?? 0}
      blacklist={rows}
      canManage={canManage}
    />
  );
}
