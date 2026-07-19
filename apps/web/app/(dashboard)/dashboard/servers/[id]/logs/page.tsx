import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  PASSED: 'text-emerald-300',
  FAILED: 'text-red-300',
  PENDING: 'text-slate-400',
};

export default async function LogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);

  const logs = await prisma.verification.findMany({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Verification logs</h2>
        <p className="text-sm text-slate-400">
          Consent-based records only - Discord username, result and time. No IP, email or device
          data is stored.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="card text-sm text-slate-400">No verification activity yet.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-border text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-surface-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <div>{l.username || '-'}</div>
                    <div className="font-mono text-xs text-slate-500">{l.discordId}</div>
                  </td>
                  <td className={`px-4 py-3 font-medium ${STATUS_STYLES[l.status] ?? ''}`}>
                    {l.status}
                  </td>
                  <td className="px-4 py-3">{l.method}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {(l.completedAt ?? l.createdAt).toLocaleString()}
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
