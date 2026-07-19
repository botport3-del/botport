import Link from 'next/link';
import { prisma } from 'db';
import type { GuildSnapshot, SnapshotChannel } from 'core';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';

export const dynamic = 'force-dynamic';

function roleColor(color: number): string {
  if (!color) return '#99aab5';
  return `#${color.toString(16).padStart(6, '0')}`;
}

function channelGlyph(type: number): string {
  if (type === 2 || type === 13) return 'VC';
  if (type === 15) return 'FR';
  if (type === 5) return 'AN';
  return '#';
}

export default async function StructurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);

  const backup = await prisma.backup.findFirst({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!backup) {
    return (
      <div className="card text-sm text-slate-400">
        No server structure captured yet. Create a backup (once the bot is connected) to see roles
        and channels here.
      </div>
    );
  }

  const snap = backup.data as unknown as GuildSnapshot;

  const roles = [...snap.roles].sort((a, b) => b.position - a.position);
  const categories = snap.channels.filter((c) => c.type === 4).sort((a, b) => a.position - b.position);
  const byParent = (parentId: string | null) =>
    snap.channels
      .filter((c) => c.type !== 4 && (c.parentId ?? null) === parentId)
      .sort((a, b) => a.position - b.position);
  const uncategorised = byParent(null);

  const ChannelRow = ({ c }: { c: SnapshotChannel }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300">
      <span className="w-4 text-center text-slate-500">{channelGlyph(c.type)}</span>
      <span className="truncate">{c.name}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-brand">Structure</div>
        <h2 className="mt-1.5 text-lg font-semibold">Roles &amp; channels</h2>
        <p className="text-sm text-slate-400">
          Snapshot from your latest backup ({new Date(backup.createdAt).toLocaleString()}).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Roles */}
        <div className="card">
          <h3 className="mb-3 font-semibold">Roles ({roles.length})</h3>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-2 rounded-full border border-surface-border px-3 py-1 text-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: roleColor(r.color) }}
                />
                {r.name}
              </span>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div className="card">
          <h3 className="mb-3 font-semibold">Channels ({snap.channels.length})</h3>
          <div className="space-y-3">
            {uncategorised.length > 0 && (
              <div className="rounded-lg border border-surface-border">
                {uncategorised.map((c) => (
                  <ChannelRow key={c.id} c={c} />
                ))}
              </div>
            )}
            {categories.map((cat) => (
              <div key={cat.id} className="rounded-lg border border-surface-border">
                <div className="border-b border-surface-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {cat.name}
                </div>
                {byParent(cat.id).map((c) => (
                  <ChannelRow key={c.id} c={c} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Link href={`/dashboard/servers/${guild.id}/backups`} className="btn-ghost inline-flex text-xs">
        Manage backups
      </Link>
    </div>
  );
}
