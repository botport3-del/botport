'use client';

import { useActionState } from 'react';
import {
  saveGeneralSettings,
  addBlacklist,
  removeBlacklist,
  type SettingsState,
} from './actions';

export interface BlacklistView {
  id: string;
  discordId: string;
  reason: string | null;
}

export function SettingsPanel({
  guildId,
  backupSchedule,
  blockKnownVpns,
  joinRateLimit,
  blacklist,
  canManage,
}: {
  guildId: string;
  backupSchedule: string;
  blockKnownVpns: boolean;
  joinRateLimit: number;
  blacklist: BlacklistView[];
  canManage: boolean;
}) {
  const [genState, saveGen, savingGen] = useActionState<SettingsState, FormData>(
    saveGeneralSettings.bind(null, guildId),
    {},
  );
  const [blState, addBl, addingBl] = useActionState<SettingsState, FormData>(
    addBlacklist.bind(null, guildId),
    {},
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Server settings</h2>
        <p className="text-sm text-slate-400">Backups, anti-raid options and blacklist.</p>
      </div>

      <form action={saveGen} className="card space-y-4">
        <h3 className="font-semibold">General</h3>
        <label className="block">
          <span className="block text-sm font-medium">Backup schedule</span>
          <select
            name="backupSchedule"
            defaultValue={backupSchedule}
            disabled={!canManage}
            className="mt-1 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="OFF">Off</option>
            <option value="DAILY">Daily</option>
            <option value="HOURLY">Hourly</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Raid alert threshold (joins/min)</span>
          <span className="block text-xs text-slate-500">0 disables raid alerts.</span>
          <input
            name="joinRateLimit"
            type="number"
            defaultValue={joinRateLimit}
            disabled={!canManage}
            className="mt-1 w-32 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="blockKnownVpns"
            defaultChecked={blockKnownVpns}
            disabled={!canManage}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium">Block known VPNs/proxies</span>
            <span className="block text-xs text-slate-500">
              Opt-in and disclosed to members on the verify page.
            </span>
          </span>
        </label>

        {genState.ok && <p className="text-sm text-emerald-300">{genState.ok}</p>}
        {genState.error && <p className="text-sm text-red-300">{genState.error}</p>}
        {canManage && (
          <button className="btn-primary" disabled={savingGen}>
            {savingGen ? 'Saving…' : 'Save settings'}
          </button>
        )}
      </form>

      <div className="card space-y-4">
        <h3 className="font-semibold">Blacklist</h3>
        {blacklist.length === 0 ? (
          <p className="text-sm text-slate-400">No blacklisted users.</p>
        ) : (
          <ul className="space-y-2">
            {blacklist.map((b) => (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono">{b.discordId}</span>
                  {b.reason && <span className="ml-2 text-slate-500">— {b.reason}</span>}
                </div>
                {canManage && (
                  <form action={removeBlacklist.bind(null, guildId, b.id)}>
                    <button className="btn-ghost text-xs">Remove</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <form action={addBl} className="flex flex-col gap-3 border-t border-surface-border pt-4 sm:flex-row">
            <input
              name="discordId"
              placeholder="Discord user ID"
              className="flex-1 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <input
              name="reason"
              placeholder="Reason (optional)"
              className="flex-1 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button className="btn-primary" disabled={addingBl}>
              {addingBl ? 'Adding…' : 'Add'}
            </button>
          </form>
        )}
        {blState.ok && <p className="text-sm text-emerald-300">{blState.ok}</p>}
        {blState.error && <p className="text-sm text-red-300">{blState.error}</p>}
      </div>
    </div>
  );
}
