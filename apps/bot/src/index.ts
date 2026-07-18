import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { env } from './env.js';
import { commandMap } from './commands/index.js';
import { startBackupScheduler } from './cron.js';
import { handleVerifyButton, VERIFY_BUTTON_ID } from './lib/verify-service.js';

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
    try {
      if (interaction.isButton()) {
        if (interaction.customId === VERIFY_BUTTON_ID) {
          await handleVerifyButton(interaction);
        }
        return;
      }
      if (interaction.isChatInputCommand()) {
        const command = commandMap.get(interaction.commandName);
        if (command) await command.execute(interaction);
      }
    } catch (err) {
      console.error('[bot] interaction failed:', err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: 'Something went wrong.', ephemeral: true })
          .catch(() => {});
      }
    }
  });

  await client.login(env.botToken);
}

main().catch((err) => {
  console.error('[bot] Fatal error during startup:', err);
  process.exit(1);
});
