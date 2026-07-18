'use client';

import { useActionState } from 'react';
import {
  createBackupAction,
  restoreBackupAction,
  deleteBackupAction,
  type ActionState,
} from './actions';

export interface BackupView {
  id: string;
  label: string;
  type: string;
  createdAt: string;
  roles: number;
  channels: number;
}

const EMPTY: ActionState = {};

function Notice({ state }: { state: ActionState }) {
  if (state.ok)
    return (
      <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
        {state.ok}
      </p>
    );
  if (state.error)
    return (
      <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        {state.error}
      </p>
    );
  return null;
}

export function BackupsPanel({
  guildId,
  backups,
  botConfigured,
  schedule,
}: {
  guildId: string;
  backups: BackupView[];
  botConfigured: boolean;
  schedule: string;
}) {
  const [createState, create, creating] = useActionState(
    createBackupAction.bind(null, guildId),
    EMPTY,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Backups</h2>
          <p className="text-sm text-slate-400">
            Snapshots of roles, channels and settings. Scheduled: <b>{schedule}</b>.
          </p>
        </div>
        <form action={create}>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? 'Creating…' : 'Create backup now'}
          </button>
        </form>
      </div>

      <Notice state={createState} />

      {!botConfigured && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          No bot token is configured, so live backups can&apos;t be captured yet. Set
          <code className="mx-1">DISCORD_BOT_TOKEN</code> and invite the bot to enable this.
        </p>
      )}

      {backups.length === 0 ? (
        <div className="card text-sm text-slate-400">No backups yet.</div>
      ) : (
        <ul className="space-y-3">
          {backups.map((b) => (
            <BackupRow key={b.id} guildId={guildId} backup={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BackupRow({ guildId, backup }: { guildId: string; backup: BackupView }) {
  const [restoreState, restore, restoring] = useActionState(
    restoreBackupAction.bind(null, guildId, backup.id),
    EMPTY,
  );

  return (
    <li className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium">{backup.label}</div>
          <div className="text-xs text-slate-500">
            {backup.type} · {new Date(backup.createdAt).toLocaleString()} · {backup.roles} roles ·{' '}
            {backup.channels} channels
          </div>
        </div>
        <div className="flex items-center gap-2">
          <form action={restore}>
            <button type="submit" className="btn-ghost text-xs" disabled={restoring}>
              {restoring ? 'Restoring…' : 'Restore'}
            </button>
          </form>
          <form action={deleteBackupAction.bind(null, guildId, backup.id)}>
            <button type="submit" className="btn-ghost text-xs text-red-300 hover:border-red-500/60">
              Delete
            </button>
          </form>
        </div>
      </div>
      <Notice state={restoreState} />
    </li>
  );
}
