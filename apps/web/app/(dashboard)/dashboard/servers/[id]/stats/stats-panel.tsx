'use client';

interface StatsPanelProps {
  totals: {
    backups: number;
    verified: number;
    blocked: number;
    blacklisted: number;
    verified7d: number;
    verified30d: number;
  };
  dailyVerifications: Record<string, { passed: number; failed: number }>;
  dailyBackups: Record<string, number>;
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`mt-1 text-2xl font-bold ${accent}`}>{value}</span>
    </div>
  );
}

function BarChart({
  data,
  maxValue,
  color,
}: {
  data: { label: string; value: number }[];
  maxValue: number;
  color: string;
}) {
  if (data.length === 0) return <div className="text-sm text-slate-500">No data yet.</div>;
  const max = maxValue || 1;
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 120 }}>
      {data.map((d) => (
        <div key={d.label} className="group relative flex-1" style={{ height: '100%' }}>
          <div
            className={`absolute bottom-0 w-full rounded-t ${color} transition-all`}
            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%` }}
          />
          <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-surface-card px-2 py-1 text-xs text-slate-300 shadow group-hover:block">
            {d.label}: {d.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function getLast30Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function StatsPanel({ totals, dailyVerifications, dailyBackups }: StatsPanelProps) {
  const days = getLast30Days();

  const verifyData = days.map((d) => ({
    label: d,
    value: (dailyVerifications[d]?.passed ?? 0) + (dailyVerifications[d]?.failed ?? 0),
  }));
  const passedData = days.map((d) => ({
    label: d,
    value: dailyVerifications[d]?.passed ?? 0,
  }));
  const failedData = days.map((d) => ({
    label: d,
    value: dailyVerifications[d]?.failed ?? 0,
  }));
  const backupData = days.map((d) => ({
    label: d,
    value: dailyBackups[d] ?? 0,
  }));

  const maxVerify = Math.max(...verifyData.map((d) => d.value), 1);
  const maxBackup = Math.max(...backupData.map((d) => d.value), 1);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-brand">Analytics</div>
        <h2 className="mt-1.5 text-lg font-semibold">Statistics</h2>
        <p className="text-sm text-slate-400">Activity overview for the last 30 days.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MiniStat label="Total backups" value={totals.backups} accent="text-white" />
        <MiniStat label="Verified (all time)" value={totals.verified} accent="text-emerald-400" />
        <MiniStat label="Blocked (all time)" value={totals.blocked} accent="text-red-400" />
        <MiniStat label="Blacklisted" value={totals.blacklisted} accent="text-amber-400" />
        <MiniStat label="Verified (7 days)" value={totals.verified7d} accent="text-blue-400" />
        <MiniStat label="Verified (30 days)" value={totals.verified30d} accent="text-brand" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-1 font-semibold">Verifications (30d)</h3>
          <p className="mb-4 text-xs text-slate-500">Passed verifications per day</p>
          <BarChart data={passedData} maxValue={maxVerify} color="bg-emerald-500" />
          <div className="mt-2 flex justify-between text-[10px] text-slate-600">
            <span>{days[0]}</span>
            <span>{days[days.length - 1]}</span>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-1 font-semibold">Blocked attempts (30d)</h3>
          <p className="mb-4 text-xs text-slate-500">Failed verifications per day</p>
          <BarChart data={failedData} maxValue={maxVerify} color="bg-red-500" />
          <div className="mt-2 flex justify-between text-[10px] text-slate-600">
            <span>{days[0]}</span>
            <span>{days[days.length - 1]}</span>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h3 className="mb-1 font-semibold">Backups (30d)</h3>
          <p className="mb-4 text-xs text-slate-500">Backups created per day</p>
          <BarChart data={backupData} maxValue={maxBackup} color="bg-brand" />
          <div className="mt-2 flex justify-between text-[10px] text-slate-600">
            <span>{days[0]}</span>
            <span>{days[days.length - 1]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
