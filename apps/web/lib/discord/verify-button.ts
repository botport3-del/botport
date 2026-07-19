import 'server-only';
import type { APIMessageComponentInteraction } from 'discord-api-types/v10';
import { ButtonStyle, ComponentType } from 'discord-api-types/v10';
import { prisma } from 'db';
import {
  createRest,
  addRole,
  addRoles,
  postChannelMessage,
  snowflakeAgeDays,
  signVerifyToken,
} from 'core';
import { env } from '../env';
import { getBaseUrl } from '../base-url';
import { editOriginalResponse } from './webhook';
import { type CommandResult, ephemeral } from './types';

export const VERIFY_BUTTON_ID = 'verify:start';

/** Handles a click on the "Verify" button posted by /verify-embed. */
export async function handleVerifyButton(
  interaction: APIMessageComponentInteraction,
): Promise<CommandResult> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) {
    return { kind: 'immediate', response: ephemeral('This only works in a server.') };
  }

  const guild = await prisma.guild.findUnique({
    where: { discordId: guildId },
    include: { settings: true },
  });
  if (!guild || !guild.settings?.verifyEnabled) {
    return { kind: 'immediate', response: ephemeral('Verification is not enabled on this server.') };
  }
  const settings = guild.settings;

  if (settings.minAccountAgeDays > 0) {
    const ageDays = snowflakeAgeDays(user.id);
    if (ageDays < settings.minAccountAgeDays) {
      return {
        kind: 'immediate',
        response: ephemeral(`Your account must be at least ${settings.minAccountAgeDays} day(s) old to verify.`),
      };
    }
  }

  const blacklisted = await prisma.blacklistEntry.findUnique({
    where: { guildId_discordId: { guildId: guild.id, discordId: user.id } },
  });
  if (blacklisted) {
    return { kind: 'immediate', response: ephemeral('You are not permitted to verify in this server.') };
  }

  const needsPage = settings.captchaEnabled || settings.requireOAuthIdentify;
  if (needsPage) {
    const baseUrl = await getBaseUrl();
    const token = await signVerifyToken(env.authSecret, {
      guildId: guild.id,
      discordUserId: user.id,
      username: user.username,
    });
    const url = `${baseUrl}/verify/${guild.id}?token=${encodeURIComponent(token)}`;
    return {
      kind: 'immediate',
      response: {
        type: 4,
        data: {
          content: 'Click below to complete verification (link expires in 15 minutes):',
          flags: 64,
          components: [
            {
              type: 1,
              components: [
                { type: ComponentType.Button, style: ButtonStyle.Link, label: 'Open verification', url },
              ],
            },
          ],
        },
      },
    };
  }

  // No-sign-in path: assign roles directly (needs a live REST call, so defer).
  return {
    kind: 'deferred',
    work: async () => {
      if (!env.discordBotToken) {
        await editOriginalResponse(interaction.token, { content: 'Bot is not configured.' });
        return;
      }
      const rest = createRest(env.discordBotToken);
      try {
        if (settings.verifyRoleId) {
          await addRole(rest, guild.discordId, user.id, settings.verifyRoleId);
        }
        if (settings.autoRoleIds.length > 0) {
          await addRoles(rest, guild.discordId, user.id, settings.autoRoleIds);
        }
      } catch (e) {
        await editOriginalResponse(interaction.token, {
          content: `Could not assign your role: ${e instanceof Error ? e.message : e}`,
        });
        return;
      }

      await prisma.verification.create({
        data: {
          guildId: guild.id,
          discordId: user.id,
          username: user.username,
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
                fields: [{ name: 'User', value: `<@${user.id}> (${user.username})` }],
                timestamp: new Date().toISOString(),
              },
            ],
          });
        } catch {
          // non-critical
        }
      }

      await editOriginalResponse(interaction.token, { content: "You're verified. Welcome!" });
    },
  };
}
