import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';
import { env } from './env.js';

/**
 * Registers slash commands with Discord.
 * If DISCORD_DEV_GUILD_IDS is set, commands are registered per-guild (instant);
 * otherwise they are registered globally (may take up to an hour to propagate).
 */
async function main() {
  if (!env.botToken || !env.clientId) {
    console.error('[register] DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required.');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(env.botToken);
  const body = commands.map((c) => c.data.toJSON());

  if (env.devGuildIds.length > 0) {
    for (const guildId of env.devGuildIds) {
      await rest.put(Routes.applicationGuildCommands(env.clientId, guildId), { body });
      console.log(`[register] Registered ${body.length} commands to guild ${guildId}.`);
    }
  } else {
    await rest.put(Routes.applicationCommands(env.clientId), { body });
    console.log(`[register] Registered ${body.length} global commands.`);
  }
}

main().catch((e) => {
  console.error('[register] failed:', e);
  process.exit(1);
});
