import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { env } from './env.js';

/**
 * Botport worker entrypoint.
 *
 * Boots a discord.js client, wires up interaction handling and the backup
 * scheduler. If no bot token is configured the process logs a warning and stays
 * idle instead of crashing — this keeps `pnpm dev` usable before credentials
 * are set up.
 */
async function main() {
  if (!env.botToken) {
    console.warn(
      '[bot] DISCORD_BOT_TOKEN is not set — the bot will not connect. ' +
        'Set it in .env to enable live Discord features.',
    );
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
    ],
    partials: [Partials.GuildMember],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`[bot] Logged in as ${c.user.tag} (${c.user.id})`);
  });

  await client.login(env.botToken);
}

main().catch((err) => {
  console.error('[bot] Fatal error during startup:', err);
  process.exit(1);
});
