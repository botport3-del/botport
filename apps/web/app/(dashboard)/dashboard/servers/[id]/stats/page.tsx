import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { StatsPanel } from './stats-panel';

export const dynamic = 'force-dynamic';

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalBackups,
    totalVerified,
    totalBlocked,
    totalBlacklisted,
    recentVerifications,
    recentBackups,
    verifications7d,
    verifications30d,
  ] = await Promise.all([
    prisma.backup.count({ where: { guildId: guild.id } }),
    prisma.verification.count({ where: { guildId: guild.id, status: 'PASSED' } }),
    prisma.verification.count({ where: { guildId: guild.id, status: 'FAILED' } }),
    prisma.blacklistEntry.count({ where: { guildId: guild.id } }),
    prisma.verification.findMany({
      where: { guildId: guild.id, createdAt: { gte: thirtyDaysAgo } },
      select: { status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.backup.findMany({
      where: { guildId: guild.id, createdAt: { gte: thirtyDaysAgo } },
      select: { type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.verification.count({
      where: { guildId: guild.id, status: 'PASSED', createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.verification.count({
      where: { guildId: guild.id, status: 'PASSED', createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  const dailyVerifications: Record<string, { passed: number; failed: number }> = {};
  for (const v of recentVerifications) {
    const day = v.createdAt.toISOString().slice(0, 10);
    if (!dailyVerifications[day]) dailyVerifications[day] = { passed: 0, failed: 0 };
    if (v.status === 'PASSED') dailyVerifications[day].passed++;
    else if (v.status === 'FAILED') dailyVerifications[day].failed++;
  }

  const dailyBackups: Record<string, number> = {};
  for (const b of recentBackups) {
    const day = b.createdAt.toISOString().slice(0, 10);
    dailyBackups[day] = (dailyBackups[day] || 0) + 1;
  }

  return (
    <StatsPanel
      totals={{
        backups: totalBackups,
        verified: totalVerified,
        blocked: totalBlocked,
        blacklisted: totalBlacklisted,
        verified7d: verifications7d,
        verified30d: verifications30d,
      }}
      dailyVerifications={dailyVerifications}
      dailyBackups={dailyBackups}
    />
  );
}
