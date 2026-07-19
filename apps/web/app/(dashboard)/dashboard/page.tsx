import Link from 'next/link';
import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { getConnectedGuilds } from '@/lib/guilds';
import { StatCard } from '@/components/dashboard/stat-card';
import { ServerCard } from '@/components/dashboard/server-card';
import { ArchiveIcon, ShieldIcon, TeamIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const user = await requireUser();
  const guilds = await getConnectedGuilds(user.id);

  const guildIds = guilds.map((g) => g.id);
  const [backupCount, verifiedCount] = await Promise.all([
    prisma.backup.count({ where: { guildId: { in: guildIds } } }),
    prisma.verification.count({
      where: { guildId: { in: guildIds }, status: 'PASSED' },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-brand">Overview</div>
        <h1 className="mt-1.5 text-2xl font-bold">
          Welcome back, {user.globalName || user.username}
        </h1>
        <p className="mt-1 text-sm text-slate-400">Here&apos;s what&apos;s happening across your servers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Connected servers"
          value={guilds.length}
          icon={<TeamIcon className="h-5 w-5" />}
          accent="brand"
        />
        <StatCard
          label="Backups stored"
          value={backupCount}
          icon={<ArchiveIcon className="h-5 w-5" />}
          accent="slate"
        />
        <StatCard
          label="Members verified"
          value={verifiedCount}
          icon={<ShieldIcon className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your servers</h2>
          <Link href="/dashboard/servers" className="text-sm text-brand hover:underline">
            Manage all →
          </Link>
        </div>

        {guilds.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand">
              <TeamIcon className="h-6 w-6" />
            </span>
            <p className="mt-4 font-medium">No servers connected yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Invite the Botport bot to a server you manage to start backing it up and verifying
              members.
            </p>
            <Link href="/dashboard/servers" className="btn-primary mt-5">
              Add a server
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guilds.map((g) => (
              <ServerCard
                key={g.id}
                href={`/dashboard/servers/${g.id}`}
                name={g.name}
                iconUrl={g.iconUrl}
                subtitle="Connected"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
