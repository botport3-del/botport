import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess, getEffectiveRole } from '@/lib/guild-access';

export const dynamic = 'force-dynamic';

const ACTION_LABELS: Record<string, string> = {
  'backup.create': 'Created backup',
  'backup.restore': 'Restored backup',
  'backup.delete': 'Deleted backup',
  'settings.update': 'Updated settings',
  'verification.toggle': 'Toggled verification',
  'blacklist.add': 'Added to blacklist',
  'blacklist.remove': 'Removed from blacklist',
  'staff.add': 'Added staff member',
  'staff.remove': 'Removed staff member',
  'staff.update': 'Updated staff role',
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function actionIcon(action: string): string {
  if (action.startsWith('backup')) return 'B';
  if (action.startsWith('settings') || action.startsWith('verification')) return 'S';
  if (action.startsWith('blacklist')) return 'X';
  if (action.startsWith('staff')) return 'T';
  return 'A';
}

function actionColor(action: string): string {
  if (action.startsWith('backup.create')) return 'bg-emerald-500/20 text-emerald-400';
  if (action.startsWith('backup.restore')) return 'bg-blue-500/20 text-blue-400';
  if (action.startsWith('backup.delete')) return 'bg-red-500/20 text-red-400';
  if (action.startsWith('blacklist')) return 'bg-amber-500/20 text-amber-400';
  if (action.startsWith('staff')) return 'bg-purple-500/20 text-purple-400';
  return 'bg-slate-500/20 text-slate-400';
}

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);
  const role = await getEffectiveRole(user.id, guild.id);

  if (role !== 'OWNER' && role !== 'ADMIN') {
    return (
      <div className="card text-sm text-slate-400">
        Only owners and admins can view the audit log.
      </div>
    );
  }

  const logs = await prisma.auditLog.findMany({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { actor: { select: { username: true, globalName: true, discordId: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-brand">Audit</div>
        <h2 className="mt-1.5 text-lg font-semibold">Audit log</h2>
        <p className="text-sm text-slate-400">
          A record of all administrative actions taken on this server.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="card text-sm text-slate-400">No audit entries yet.</div>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="card flex items-start gap-3 py-3">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${actionColor(l.action)}`}
              >
                {actionIcon(l.action)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">
                    {l.actor?.globalName || l.actor?.username || 'System'}
                  </span>
                  <span className="text-sm text-slate-400">{actionLabel(l.action)}</span>
                </div>
                {l.meta && typeof l.meta === 'object' && (
                  <div className="mt-1 text-xs text-slate-500">
                    {Object.entries(l.meta as Record<string, unknown>)
                      .filter(([, v]) => v !== null && v !== undefined)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' / ')}
                  </div>
                )}
                <div className="mt-1 text-xs text-slate-500">
                  {l.createdAt.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
