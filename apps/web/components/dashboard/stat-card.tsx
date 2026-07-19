import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: 'brand' | 'emerald' | 'slate';
}) {
  const accentClass =
    accent === 'emerald'
      ? 'text-emerald-400 bg-emerald-500/10'
      : accent === 'slate'
        ? 'text-slate-300 bg-white/5'
        : 'text-brand bg-brand/10';

  return (
    <div className="card flex items-start justify-between">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-slate-500">{label}</div>
        <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      </div>
      {icon && (
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${accentClass}`}>{icon}</span>
      )}
    </div>
  );
}
