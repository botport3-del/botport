import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
} from 'discord.js';
import { prisma } from 'db';
import {
  createRest,
  addRole,
  addRoles,
  postChannelMessage,
  snowflakeAgeDays,
  signVerifyToken,
} from 'core';
import { env } from '../env.js';

export const VERIFY_BUTTON_ID = 'verify:start';

/**
 * Handles a click on the "Verify" button.
 *
 * - CAPTCHA / OAuth path: sends the member an ephemeral link to the branded
 *   verify page carrying a signed token that identifies them.
 * - No-sign-in path: assigns roles directly after anti-raid checks.
 */
export async function handleVerifyButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const guild = await prisma.guild.findUnique({
    where: { discordId: interaction.guild.id },
    include: { settings: true },
  });

  if (!guild || !guild.settings?.verifyEnabled) {
    await interaction.reply({ content: 'Verification is not enabled on this server.', ephemeral: true });
    return;
  }
  const settings = guild.settings;

  // Anti-raid: minimum account age (derived from snowflake — no API call)
  if (settings.minAccountAgeDays > 0) {
    const ageDays = snowflakeAgeDays(interaction.user.id);
    if (ageDays < settings.minAccountAgeDays) {
      await interaction.reply({
        content: `Your account must be at least ${settings.minAccountAgeDays} day(s) old to verify.`,
        ephemeral: true,
      });
      return;
    }
  }

  // Anti-raid: blacklist
  const blacklisted = await prisma.blacklistEntry.findUnique({
    where: { guildId_discordId: { guildId: guild.id, discordId: interaction.user.id } },
  });
  if (blacklisted) {
    await interaction.reply({ content: 'You are not permitted to verify in this server.', ephemeral: true });
    return;
  }

  const needsPage = settings.captchaEnabled || settings.requireOAuthIdentify;

  if (needsPage) {
    const token = await signVerifyToken(env.authSecret, {
      guildId: guild.id,
      discordUserId: interaction.user.id,
      username: interaction.user.username,
    });
    const url = `${env.appBaseUrl}/verify/${guild.id}?token=${encodeURIComponent(token)}`;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel('Open verification').setStyle(ButtonStyle.Link).setURL(url),
    );
    await interaction.reply({
      content: 'Click below to complete verification (link expires in 15 minutes):',
      components: [row],
      ephemeral: true,
    });
    return;
  }

  // No-sign-in path: assign roles directly.
  await interaction.deferReply({ ephemeral: true });
  const rest = createRest(env.botToken!);
  try {
    if (settings.verifyRoleId) {
      await addRole(rest, guild.discordId, interaction.user.id, settings.verifyRoleId);
    }
    if (settings.autoRoleIds.length > 0) {
      await addRoles(rest, guild.discordId, interaction.user.id, settings.autoRoleIds);
    }
  } catch (e) {
    await interaction.editReply(`Could not assign your role: ${e instanceof Error ? e.message : e}`);
    return;
  }

  await prisma.verification.create({
    data: {
      guildId: guild.id,
      discordId: interaction.user.id,
      username: interaction.user.username,
      status: 'PASSED',
      method: 'captcha',
      consentGiven: true,
      completedAt: new Date(),
    },
  });

  if (settings.logChannelId) {
    try {
      await postChannelMessage(rest, settings.logChannelId, {
        embeds: [
          {
            title: 'Member verified',
            color: 0x22c55e,
            fields: [
              { name: 'User', value: `<@${interaction.user.id}> (${interaction.user.username})` },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch {
      // non-critical
    }
  }

  await interaction.editReply("You're verified. Welcome!");
}
