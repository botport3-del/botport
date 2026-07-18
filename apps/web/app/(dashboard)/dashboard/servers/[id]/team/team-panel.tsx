'use client';

import { useActionState } from 'react';
import { inviteStaff, removeStaff, type TeamState } from './actions';

export interface StaffView {
  id: string;
  label: string;
  role: string;
  isOwner: boolean;
}

export function TeamPanel({
  guildId,
  staff,
  canManage,
}: {
  guildId: string;
  staff: StaffView[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState<TeamState, FormData>(
    inviteStaff.bind(null, guildId),
    {},
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Team</h2>
        <p className="text-sm text-slate-400">
          Invite staff with scoped permissions. Admins can manage everything; mods handle
          verification.
        </p>
      </div>

      <ul className="space-y-2">
        {staff.map((s) => (
          <li key={s.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium">{s.label}</div>
              <div className="text-xs text-slate-500">{s.role}</div>
            </div>
            {canManage && !s.isOwner && (
              <form action={removeStaff.bind(null, guildId, s.id)}>
                <button className="btn-ghost text-xs text-red-300 hover:border-red-500/60">
                  Remove
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {canManage ? (
        <form action={action} className="card space-y-3">
          <h3 className="font-semibold">Invite staff</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="email"
              type="email"
              placeholder="staff@example.com"
              className="flex-1 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <select
              name="role"
              className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              defaultValue="MOD"
            >
              <option value="MOD">Mod</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Inviting…' : 'Invite'}
            </button>
          </div>
          {state.ok && <p className="text-sm text-emerald-300">{state.ok}</p>}
          {state.error && <p className="text-sm text-red-300">{state.error}</p>}
        </form>
      ) : (
        <p className="text-sm text-slate-500">Only owners and admins can manage the team.</p>
      )}
    </div>
  );
}
