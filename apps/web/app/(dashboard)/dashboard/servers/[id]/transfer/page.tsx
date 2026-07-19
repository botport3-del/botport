import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { TransferPanel, type MemberOption, type BatchView } from './transfer-panel';

export const dynamic = 'force-dynamic';

export default async function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);

  // Members who consented to guilds.join (only they can be transferred silently)
  const consented = await prisma.verification.findMany({
    where: {
      guildId: guild.id,
      status: 'PASSED',
      oauthRefreshToken: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  const members: MemberOption[] = consented.map((v) => ({
    id: v.discordId,
    username: v.username ?? v.discordId,
    consentedAt: (v.oauthConsentAt ?? v.createdAt).toISOString(),
  }));

  const batches = await prisma.transferBatch.findMany({
    where: { guildId: guild.id },
    include: { invitations: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const batchViews: BatchView[] = batches.map((b) => {
    const counts = { total: b.invitations.length, joined: 0, failed: 0, pending: 0 };
    for (const i of b.invitations) {
      if (i.status === 'JOINED') counts.joined++;
      else if (i.status === 'FAILED' || i.status === 'DMS_DISABLED') counts.failed++;
      else counts.pending++;
    }
    return {
      id: b.id,
      createdAt: b.createdAt.toISOString(),
      targetGuildId: b.targetGuildId,
      inviteUrl: b.inviteUrl,
      counts,
      invitations: b.invitations.map((i) => ({
        id: i.id,
        discordId: i.discordId,
        username: i.username,
        status: i.status,
        attempts: i.attempts,
        lastError: i.lastError,
        joinedAt: i.joinedAt?.toISOString() ?? null,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-brand">Server transfer</div>
        <h2 className="mt-1.5 text-lg font-semibold">Move verified members to a new server</h2>
        <p className="text-sm text-slate-400">
          Members who verified with the Discord OAuth flow can be re-added to another server you
          run. Discord will show them the standard &quot;an application added you to server X&quot;
          notification.
        </p>
      </div>
      <TransferPanel guildId={guild.id} members={members} batches={batchViews} />
    </div>
  );
}
