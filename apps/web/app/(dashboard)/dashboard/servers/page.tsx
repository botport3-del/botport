import { requireUser } from '@/lib/auth';
import { getConnectedGuilds, getConnectableGuilds } from '@/lib/guilds';
import { botInviteUrl, guildIconUrl } from '@/lib/discord';
import { env } from '@/lib/env';
import { ServerCard } from '@/components/dashboard/server-card';

export const dynamic = 'force-dynamic';

export default async function ServersPage() {
  const user = await requireUser();
  const connected = await getConnectedGuilds(user.id);
  const connectable = await getConnectableGuilds(connected);

  return (
    <div className="space-y-8">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-brand">Servers</div>
        <h1 className="mt-1.5 text-2xl font-bold">Your servers</h1>
        <p className="mt-1 text-sm text-slate-400">
          Connect a server by adding the Botport bot, then configure it here.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Connected</h2>
        {connected.length === 0 ? (
          <div className="card text-sm text-slate-400">No servers connected yet.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connected.map((g) => (
              <ServerCard
                key={g.id}
                href={`/dashboard/servers/${g.id}`}
                name={g.name}
                iconUrl={g.iconUrl}
                subtitle="Connected"
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Add a server</h2>
        {connectable.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connectable.map((g) => (
              <ServerCard
                key={g.id}
                name={g.name}
                iconUrl={guildIconUrl(g.id, g.icon)}
                subtitle="You manage this server"
                action={
                  <a
                    href={botInviteUrl(g.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs"
                  >
                    Add bot
                  </a>
                }
              />
            ))}
          </div>
        ) : (
          <div className="card space-y-3 text-sm text-slate-400">
            <p>
              Invite the Botport bot to a server you manage. Once it joins, the server appears in
              your connected list.
            </p>
            {env.discordClientId ? (
              <a href={botInviteUrl()} target="_blank" rel="noreferrer" className="btn-primary inline-flex">
                Invite Botport bot
              </a>
            ) : (
              <p className="text-xs text-slate-500">
                Set <code>DISCORD_CLIENT_ID</code> to enable the bot invite link.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
