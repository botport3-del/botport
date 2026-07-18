import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { restoreLatest } from '../lib/backup-service.js';
import { env } from '../env.js';

export const data = new SlashCommandBuilder()
  .setName('restore')
  .setDescription('Restore this server from its most recent backup.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    const outcome = await restoreLatest(env.botToken!, interaction.guild.id);
    if (!outcome) {
      await interaction.editReply('No backups found for this server.');
      return;
    }
    const { result } = outcome;
    const warn = result.warnings.length ? `\n⚠️ ${result.warnings.length} warning(s).` : '';
    await interaction.editReply(
      `✅ Restored ${result.rolesCreated} role(s) and ${result.channelsCreated} channel(s).${warn}`,
    );
  } catch (e) {
    await interaction.editReply(`❌ Restore failed: ${e instanceof Error ? e.message : e}`);
  }
}
