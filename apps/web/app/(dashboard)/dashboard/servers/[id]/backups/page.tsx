import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { summarizeSnapshot } from '@/lib/backups';
import { env } from '@/lib/env';
import { BackupsPanel, type BackupView, type TargetOption } from './backups-panel';

export const dynamic = 'force-dynamic';

export default async function BackupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);

  const backups = await prisma.backup.findMany({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const views: BackupView[] = backups.map((b) => {
    const s = summarizeSnapshot(b.data);
    return {
      id: b.id,
      label: b.label ?? 'Backup',
      type: b.type,
      createdAt: b.createdAt.toISOString(),
      roles: s.roles,
      channels: s.channels,
    };
  });

  // All guilds the current user owns — these are the possible restore targets.
  const ownedGuilds = await prisma.guild.findMany({
    where: { ownerUserId: user.id },
    orderBy: { connectedAt: 'desc' },
  });
  const targets: TargetOption[] = ownedGuilds.map((g) => ({
    discordId: g.discordId,
    name: g.name,
    isCurrent: g.id === guild.id,
  }));

  return (
    <BackupsPanel
      guildId={guild.id}
      backups={views}
      botConfigured={Boolean(env.discordBotToken)}
      schedule={guild.settings?.backupSchedule ?? 'DAILY'}
      currentDiscordId={guild.discordId}
      targets={targets}
    />
  );
}
