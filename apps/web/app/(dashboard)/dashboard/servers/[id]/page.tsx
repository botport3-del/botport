import Link from 'next/link';
import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { StatCard } from '@/components/dashboard/stat-card';

export const dynamic = 'force-dynamic';

export default async function ServerOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);

  const [backups, verified, latestBackup] = await Promise.all([
    prisma.backup.count({ where: { guildId: guild.id } }),
    prisma.verification.count({ where: { guildId: guild.id, status: 'PASSED' } }),
    prisma.backup.findFirst({
      where: { guildId: guild.id },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Backups" value={backups} />
        <StatCard label="Verified members" value={verified} />
        <StatCard
          label="Verification"
          value={guild.settings?.verifyEnabled ? 'On' : 'Off'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold">Latest backup</h3>
          {latestBackup ? (
            <p className="mt-2 text-sm text-slate-400">
              {latestBackup.label || latestBackup.type} —{' '}
              {latestBackup.createdAt.toLocaleString()}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No backups yet.</p>
          )}
          <Link
            href={`/dashboard/servers/${guild.id}/backups`}
            className="btn-ghost mt-4 inline-flex text-xs"
          >
            Manage backups
          </Link>
        </div>

        <div className="card">
          <h3 className="font-semibold">Verification</h3>
          <p className="mt-2 text-sm text-slate-400">
            {guild.settings?.verifyEnabled
              ? 'New members must verify before accessing the server.'
              : 'Verification is currently disabled.'}
          </p>
          <Link
            href={`/dashboard/servers/${guild.id}/verification`}
            className="btn-ghost mt-4 inline-flex text-xs"
          >
            Configure verification
          </Link>
        </div>
      </div>
    </div>
  );
}
