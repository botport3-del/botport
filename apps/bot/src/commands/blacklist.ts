import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { prisma } from 'db';

export const data = new SlashCommandBuilder()
  .setName('blacklist')
  .setDescription('Manage the verification blacklist for this server.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((s) =>
    s
      .setName('add')
      .setDescription('Blacklist a user')
      .addUserOption((o) => o.setName('user').setDescription('User to blacklist').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false)),
  )
  .addSubcommand((s) =>
    s
      .setName('remove')
      .setDescription('Remove a user from the blacklist')
      .addUserOption((o) => o.setName('user').setDescription('User to unblacklist').setRequired(true)),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'Server only.', ephemeral: true });
    return;
  }
  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) {
    await interaction.reply({ content: 'This server is not connected to Botport.', ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const target = interaction.options.getUser('user', true);

  if (sub === 'add') {
    const reason = interaction.options.getString('reason') ?? undefined;
    await prisma.blacklistEntry.upsert({
      where: { guildId_discordId: { guildId: guild.id, discordId: target.id } },
      update: { reason },
      create: { guildId: guild.id, discordId: target.id, reason, addedBy: interaction.user.id },
    });
    await interaction.reply({ content: `Blacklisted ${target.tag}.`, ephemeral: true });
  } else {
    await prisma.blacklistEntry.deleteMany({
      where: { guildId: guild.id, discordId: target.id },
    });
    await interaction.reply({ content: `Removed ${target.tag} from the blacklist.`, ephemeral: true });
  }
}
