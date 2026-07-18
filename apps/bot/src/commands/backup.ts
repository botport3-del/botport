import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { backupGuild } from '../lib/backup-service.js';
import { env } from '../env.js';

export const data = new SlashCommandBuilder()
  .setName('backup')
  .setDescription('Create a backup of this server now.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    const backup = await backupGuild(env.botToken!, interaction.guild.id, interaction.guild.name, {
      type: 'MANUAL',
      createdBy: interaction.user.id,
    });
    await interaction.editReply(`✅ Backup created (\`${backup.id}\`).`);
  } catch (e) {
    await interaction.editReply(`❌ Backup failed: ${e instanceof Error ? e.message : e}`);
  }
}
