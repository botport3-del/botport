import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { env } from './env.js';
import { commandMap } from './commands/index.js';
import { startBackupScheduler } from './cron.js';

/**
 * Botport worker entrypoint.
 *
 * Boots a discord.js client, dispatches slash-command interactions and starts
 * the backup scheduler. If no bot token is configured the process logs a
 * warning and stays idle instead of crashing — keeping `pnpm dev` usable
 * before credentials are set up.
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
    startBackupScheduler(c);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = commandMap.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[bot] command ${interaction.commandName} failed:`, err);
      const msg = { content: 'Something went wrong running that command.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg.content).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  });

  await client.login(env.botToken);
}

main().catch((err) => {
  console.error('[bot] Fatal error during startup:', err);
  process.exit(1);
});
