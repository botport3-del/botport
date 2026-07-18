import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { prisma } from 'db';
import { snowflakeToDate } from 'core';

export const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Show verification info for a member of this server.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addUserOption((o) => o.setName('user').setDescription('Member to look up').setRequired(true));

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

  const target = interaction.options.getUser('user', true);
  const [latest, passedCount, blacklisted] = await Promise.all([
    prisma.verification.findFirst({
      where: { guildId: guild.id, discordId: target.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.verification.count({
      where: { guildId: guild.id, discordId: target.id, status: 'PASSED' },
    }),
    prisma.blacklistEntry.findUnique({
      where: { guildId_discordId: { guildId: guild.id, discordId: target.id } },
    }),
  ]);

  const embed = new EmbedBuilder()
    .setTitle(`Info — ${target.tag}`)
    .setColor(blacklisted ? 0xef4444 : 0x5865f2)
    .addFields(
      { name: 'Account created', value: snowflakeToDate(target.id).toDateString(), inline: true },
      { name: 'Verified', value: passedCount > 0 ? `Yes (${passedCount}×)` : 'No', inline: true },
      {
        name: 'Last attempt',
        value: latest ? `${latest.status} · ${latest.createdAt.toDateString()}` : '—',
        inline: true,
      },
      { name: 'Blacklisted', value: blacklisted ? `Yes${blacklisted.reason ? ` (${blacklisted.reason})` : ''}` : 'No' },
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
