'use client';

import { useActionState, useMemo, useState } from 'react';
import { createTransfer, retryFailed, type ActionState } from './actions';

export interface MemberOption {
  id: string;
  username: string;
  consentedAt: string;
}

export interface InvitationView {
  id: string;
  discordId: string;
  username: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  joinedAt: string | null;
}

export interface BatchView {
  id: string;
  createdAt: string;
  targetGuildId: string;
  inviteUrl: string;
  counts: { total: number; joined: number; failed: number; pending: number };
  invitations: InvitationView[];
}

const EMPTY: ActionState = {};

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'JOINED'
      ? 'bg-emerald-500/10 text-emerald-400'
      : status === 'FAILED' || status === 'DMS_DISABLED'
        ? 'bg-red-500/10 text-red-400'
        : status === 'SENT'
          ? 'bg-blue-500/10 text-blue-400'
          : 'bg-white/5 text-slate-400';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>
  );
}

export function TransferPanel({
  guildId,
  members,
  batches,
}: {
  guildId: string;
  members: MemberOption[];
  batches: BatchView[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createTransfer.bind(null, guildId),
    EMPTY,
  );
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filtered = useMemo(
    () =>
      members.filter(
        (m) =>
          m.username.toLowerCase().includes(search.toLowerCase()) ||
          m.id.includes(search),
      ),
    [members, search],
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function selectAll() {
    setSelected(new Set(filtered.map((m) => m.id)));
  }
  function selectNone() {
    setSelected(new Set());
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="font-mono text-xs uppercase tracking-wider text-slate-500">
            Eligible members
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums">{members.length}</div>
          <div className="mt-1 text-xs text-slate-500">Consented to guilds.join</div>
        </div>
        <div className="card">
          <div className="font-mono text-xs uppercase tracking-wider text-slate-500">Selected</div>
          <div className="mt-2 text-3xl font-bold tabular-nums">{selected.size}</div>
        </div>
        <div className="card">
          <div className="font-mono text-xs uppercase tracking-wider text-slate-500">Batches</div>
          <div className="mt-2 text-3xl font-bold tabular-nums">{batches.length}</div>
        </div>
      </div>

      {/* Compose */}
      <form action={action} className="card space-y-4">
        <h3 className="font-semibold">Start transfer</h3>
        <label className="block">
          <span className="block text-sm font-medium">Target server ID</span>
          <span className="block text-xs text-slate-500">
            The Discord server the members should be added to. Devorju&apos;s bot must be a member
            of that server with permission to add members.
          </span>
          <input
            name="targetGuildId"
            placeholder="e.g. 123456789012345678"
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium">Fallback invite link (optional)</span>
          <input
            name="inviteUrl"
            placeholder="https://discord.gg/xxxxx"
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium">Note (optional, shown in audit log)</span>
          <input
            name="message"
            placeholder="Recovery after raid on Nov 21"
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>
        <input type="hidden" name="memberIds" value={Array.from(selected).join(',')} />

        {/* Member list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <input
              placeholder="Filter members by name or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button type="button" onClick={selectAll} className="btn-ghost text-xs">
              Select all filtered
            </button>
            <button type="button" onClick={selectNone} className="btn-ghost text-xs">
              Clear
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-surface-border">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-slate-400">No matching members.</p>
            ) : (
              filtered.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-surface-border/50 px-3 py-2 text-sm hover:bg-white/5 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div>{m.username}</div>
                    <div className="font-mono text-xs text-slate-500">{m.id}</div>
                  </div>
                  <div className="text-xs text-slate-500">
                    consented {new Date(m.consentedAt).toLocaleDateString()}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {state.ok && <p className="text-sm text-emerald-300">{state.ok}</p>}
        {state.error && <p className="text-sm text-red-300">{state.error}</p>}
        <button type="submit" className="btn-primary" disabled={pending || selected.size === 0}>
          {pending ? 'Sending...' : `Transfer ${selected.size} member(s)`}
        </button>
      </form>

      {/* Batches */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Recent transfers</h3>
        {batches.length === 0 ? (
          <div className="card text-sm text-slate-400">No transfers yet.</div>
        ) : (
          batches.map((b) => <BatchCard key={b.id} guildId={guildId} batch={b} />)
        )}
      </section>
    </div>
  );
}

function BatchCard({ guildId, batch }: { guildId: string; batch: BatchView }) {
  const [retryState, retry, retrying] = useActionState<ActionState, FormData>(
    retryFailed.bind(null, guildId, batch.id),
    EMPTY,
  );
  const [expanded, setExpanded] = useState(false);
  const failed = batch.counts.failed;

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium">
            Batch {batch.id.slice(-6)} - target{' '}
            <span className="font-mono">{batch.targetGuildId}</span>
          </div>
          <div className="text-xs text-slate-500">
            {new Date(batch.createdAt).toLocaleString()} - {batch.counts.total} member(s)
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-400">{batch.counts.joined} joined</span>
          <span className="text-slate-500">{batch.counts.pending} pending</span>
          <span className="text-red-400">{batch.counts.failed} failed</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Hide' : 'Details'}
          </button>
          {failed > 0 && (
            <form action={retry}>
              <button type="submit" className="btn-ghost text-xs" disabled={retrying}>
                {retrying ? 'Retrying...' : `Retry ${failed} failed`}
              </button>
            </form>
          )}
        </div>
      </div>
      {retryState.ok && <p className="text-xs text-emerald-300">{retryState.ok}</p>}
      {expanded && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-surface-border">
          {batch.invitations.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between gap-3 border-b border-surface-border/50 px-3 py-2 text-sm last:border-0"
            >
              <div>
                <div>{i.username ?? '-'}</div>
                <div className="font-mono text-xs text-slate-500">{i.discordId}</div>
                {i.lastError && (
                  <div className="text-xs text-red-400">{i.lastError}</div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">{i.attempts} attempts</span>
                <StatusPill status={i.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
