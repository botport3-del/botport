'use client';

import { useActionState } from 'react';
import { postVerifyEmbed, type SettingsState } from './actions';

export function PostEmbedForm({
  guildId,
  channels,
  defaultTitle,
  defaultDescription,
}: {
  guildId: string;
  channels: { id: string; name: string }[];
  defaultTitle: string;
  defaultDescription: string;
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    postVerifyEmbed.bind(null, guildId),
    {},
  );

  const canPost = channels.length > 0;

  return (
    <form action={action} className="card space-y-4">
      <div>
        <h3 className="font-semibold">Post Verify button</h3>
        <p className="mt-1 text-xs text-slate-500">
          Choose a channel and the bot will post the branded embed with a Verify button - no slash
          command needed.
        </p>
      </div>

      {canPost ? (
        <label className="block">
          <span className="block text-sm font-medium">Channel</span>
          <select
            name="channelId"
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">Select a channel...</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          No channels loaded. Make sure the Devorju bot is in this server and has permission to view
          channels.
        </p>
      )}

      <label className="block">
        <span className="block text-sm font-medium">Title (optional)</span>
        <input
          name="title"
          defaultValue={defaultTitle}
          placeholder="Verify to access this server"
          className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium">Description (optional)</span>
        <textarea
          name="description"
          defaultValue={defaultDescription}
          rows={2}
          placeholder="Click the button below to verify."
          className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </label>

      {state.ok && <p className="text-sm text-emerald-300">{state.ok}</p>}
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}

      <button type="submit" className="btn-primary" disabled={pending || !canPost}>
        {pending ? 'Posting...' : 'Post verify embed'}
      </button>
    </form>
  );
}
