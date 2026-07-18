import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { prisma } from 'db';
import { VERIFY_BUTTON_ID } from '../lib/verify-service.js';

export const data = new SlashCommandBuilder()
  .setName('verify-embed')
  .setDescription('Post the verification message with a Verify button.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o.setName('title').setDescription('Custom embed title').setRequired(false),
  )
  .addStringOption((o) =>
    o.setName('description').setDescription('Custom embed description').setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || interaction.channel?.type !== ChannelType.GuildText) {
    await interaction.reply({ content: 'Use this in a text channel.', ephemeral: true });
    return;
  }

  const guild = await prisma.guild.findUnique({
    where: { discordId: interaction.guild.id },
    include: { settings: true },
  });
  const color = guild?.settings?.verifyPageColor?.replace('#', '');

  const embed = new EmbedBuilder()
    .setTitle(interaction.options.getString('title') || 'Verify to access this server')
    .setDescription(
      interaction.options.getString('description') ||
        'Click the button below to verify. We only store your Discord username and that you verified — never your IP, email or device.',
    )
    .setColor(color ? parseInt(color, 16) : 0x5865f2);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success),
  );

  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: 'Verification message posted.', ephemeral: true });
}
