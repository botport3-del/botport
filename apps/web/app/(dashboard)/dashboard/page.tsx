import Link from 'next/link';
import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { getConnectedGuilds } from '@/lib/guilds';
import { StatCard } from '@/components/dashboard/stat-card';
import { ServerCard } from '@/components/dashboard/server-card';

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
        <h1 className="text-2xl font-semibold">
          Welcome back, {user.globalName || user.username}
        </h1>
        <p className="mt-1 text-sm text-slate-400">Here&apos;s an overview of your servers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Connected servers" value={guilds.length} />
        <StatCard label="Backups stored" value={backupCount} />
        <StatCard label="Members verified" value={verifiedCount} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your servers</h2>
          <Link href="/dashboard/servers" className="text-sm text-brand hover:underline">
            Manage all →
          </Link>
        </div>

        {guilds.length === 0 ? (
          <div className="card text-center">
            <p className="text-slate-400">You haven&apos;t connected any servers yet.</p>
            <Link href="/dashboard/servers" className="btn-primary mt-4 inline-flex">
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
