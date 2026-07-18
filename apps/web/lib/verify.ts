import 'server-only';
import { prisma } from 'db';
import { createRest, addRole, addRoles, postChannelMessage, snowflakeAgeDays } from 'core';
import { env } from './env';

export interface VerifyOutcome {
  ok: boolean;
  message: string;
}

/**
 * Completes verification for a member after the CAPTCHA has been validated.
 * Runs anti-raid checks (account age, blacklist), assigns the verify + auto
 * roles, records the attempt and logs to the configured channel.
 *
 * Only consent-based data (Discord id, username) is stored — never IP,
 * email or device information.
 */
export async function completeVerification(params: {
  guildDbId: string;
  discordUserId: string;
  username?: string;
  method: 'captcha' | 'oauth';
}): Promise<VerifyOutcome> {
  const { guildDbId, discordUserId, username, method } = params;

  const guild = await prisma.guild.findUnique({
    where: { id: guildDbId },
    include: { settings: true },
  });
  if (!guild || !guild.settings) {
    return { ok: false, message: 'This server is not configured for verification.' };
  }
  const settings = guild.settings;

  if (!settings.verifyEnabled) {
    return { ok: false, message: 'Verification is not enabled for this server.' };
  }

  // Anti-raid: blacklist
  const blacklisted = await prisma.blacklistEntry.findUnique({
    where: { guildId_discordId: { guildId: guild.id, discordId: discordUserId } },
  });
  if (blacklisted) {
    await recordFailure(guild.id, discordUserId, username, method);
    return { ok: false, message: 'You are not permitted to verify in this server.' };
  }

  // Anti-raid: minimum account age (derived from the snowflake — no API call)
  if (settings.minAccountAgeDays > 0) {
    const ageDays = snowflakeAgeDays(discordUserId);
    if (ageDays < settings.minAccountAgeDays) {
      await recordFailure(guild.id, discordUserId, username, method);
      return {
        ok: false,
        message: `Your account must be at least ${settings.minAccountAgeDays} day(s) old to verify.`,
      };
    }
  }

  // Assign roles via the bot (best-effort — needs a bot token to be live)
  const warnings: string[] = [];
  if (env.discordBotToken) {
    const rest = createRest(env.discordBotToken);
    try {
      if (settings.verifyRoleId) {
        await addRole(rest, guild.discordId, discordUserId, settings.verifyRoleId);
      }
      if (settings.autoRoleIds.length > 0) {
        await addRoles(rest, guild.discordId, discordUserId, settings.autoRoleIds);
      }
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : String(e));
    }
  } else {
    warnings.push('no-bot-token');
  }

  await prisma.verification.create({
    data: {
      guildId: guild.id,
      discordId: discordUserId,
      username,
      status: 'PASSED',
      method,
      consentGiven: true,
      completedAt: new Date(),
    },
  });

  // Log to the configured Discord channel (best-effort)
  if (settings.logChannelId && env.discordBotToken) {
    try {
      const rest = createRest(env.discordBotToken);
      await postChannelMessage(rest, settings.logChannelId, {
        embeds: [
          {
            title: 'Member verified',
            color: 0x22c55e,
            fields: [
              { name: 'User', value: `<@${discordUserId}> (${username ?? discordUserId})` },
              { name: 'Method', value: method, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch {
      // logging is non-critical
    }
  }

  const roleNote =
    warnings.includes('no-bot-token')
      ? ' (roles will be applied once the bot is connected)'
      : '';
  return { ok: true, message: `You're verified${roleNote}. You can return to Discord.` };
}

async function recordFailure(
  guildId: string,
  discordUserId: string,
  username: string | undefined,
  method: 'captcha' | 'oauth',
) {
  await prisma.verification.create({
    data: {
      guildId,
      discordId: discordUserId,
      username,
      status: 'FAILED',
      method,
      consentGiven: true,
      completedAt: new Date(),
    },
  });
}
