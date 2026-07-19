import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { snowflakeToDate } from 'core';

export const dynamic = 'force-dynamic';

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);

  // Distinct members that have interacted with verification, most recent first.
  const records = await prisma.verification.findMany({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const seen = new Set<string>();
  const members = records.filter((r) => {
    if (seen.has(r.discordId)) return false;
    seen.add(r.discordId);
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-brand">Members</div>
        <h2 className="mt-1.5 text-lg font-semibold">Members</h2>
        <p className="text-sm text-slate-400">
          Members who have gone through verification. A full server member list with kick/ban
          actions becomes available once the bot is connected.
        </p>
      </div>

      {members.length === 0 ? (
        <div className="card text-sm text-slate-400">No member activity yet.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-border text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Account created</th>
                <th className="px-4 py-3">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-surface-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <div>{m.username || '—'}</div>
                    <div className="font-mono text-xs text-slate-500">{m.discordId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.status === 'PASSED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : m.status === 'FAILED'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {m.status === 'PASSED' ? 'Verified' : m.status === 'FAILED' ? 'Blocked' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {snowflakeToDate(m.discordId).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {(m.completedAt ?? m.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
