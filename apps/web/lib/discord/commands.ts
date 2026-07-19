import 'server-only';
import type {
  APIChatInputApplicationCommandInteraction,
  APIApplicationCommandInteractionDataOption,
  APIApplicationCommandInteractionDataSubcommandOption,
} from 'discord-api-types/v10';
import { InteractionResponseType, ApplicationCommandOptionType, MessageFlags } from 'discord-api-types/v10';
import { prisma } from 'db';
import { createRest, postChannelMessage, snowflakeToDate } from 'core';
import { env } from '../env';
import { createGuildBackup, restoreGuildBackup } from '../backups';
import { editOriginalResponse } from './webhook';
import { VERIFY_BUTTON_ID } from './verify-button';
import { type CommandResult, ephemeral } from './types';

type Interaction = APIChatInputApplicationCommandInteraction;

function getOptions(interaction: Interaction): APIApplicationCommandInteractionDataOption[] {
  return interaction.data.options ?? [];
}

function findOption(options: APIApplicationCommandInteractionDataOption[], name: string) {
  return options.find((o) => o.name === name);
}

/** Ensures a Guild row exists (the bot may act before the dashboard connects it). */
async function ensureGuild(discordGuildId: string) {
  const existing = await prisma.guild.findUnique({ where: { discordId: discordGuildId } });
  if (existing) return existing;

  let name = 'Unknown server';
  if (env.discordBotToken) {
    try {
      const rest = createRest(env.discordBotToken);
      const live = await rest.get<{ name: string }>(`/guilds/${discordGuildId}`);
      name = live.name;
    } catch {
      // fall back to placeholder — the dashboard fixes this up once connected
    }
  }

  const owner = await prisma.user.upsert({
    where: { discordId: `system:${discordGuildId}` },
    update: {},
    create: { discordId: `system:${discordGuildId}`, username: 'unclaimed' },
  });
  return prisma.guild.create({
    data: { discordId: discordGuildId, name, ownerUserId: owner.id },
  });
}

export async function dispatchCommand(interaction: Interaction): Promise<CommandResult> {
  const guildId = interaction.guild_id;
  if (!guildId) {
    return { kind: 'immediate', response: ephemeral('This command can only be used in a server.') };
  }
  const invokerId = interaction.member?.user.id ?? interaction.user?.id ?? '';

  switch (interaction.data.name) {
    case 'backup':
      return handleBackup(guildId, invokerId, interaction.token);
    case 'restore':
      return handleRestore(guildId, interaction.token);
    case 'blacklist':
      return handleBlacklist(guildId, invokerId, interaction);
    case 'info':
      return handleInfo(guildId, interaction);
    case 'verify-embed':
      return handleVerifyEmbed(guildId, interaction);
    default:
      return { kind: 'immediate', response: ephemeral('Unknown command.') };
  }
}

function handleBackup(guildId: string, invokerId: string, token: string): CommandResult {
  return {
    kind: 'deferred',
    work: async () => {
      const guild = await ensureGuild(guildId);
      try {
        const backup = await createGuildBackup(guild.id, { type: 'MANUAL', createdBy: invokerId });
        await editOriginalResponse(token, { content: `Backup created (\`${backup.id}\`).` });
      } catch (e) {
        await editOriginalResponse(token, {
          content: `Backup failed: ${e instanceof Error ? e.message : e}`,
        });
      }
    },
  };
}

function handleRestore(guildId: string, token: string): CommandResult {
  return {
    kind: 'deferred',
    work: async () => {
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) {
        await editOriginalResponse(token, { content: 'This server is not connected to Botport.' });
        return;
      }
      const backup = await prisma.backup.findFirst({
        where: { guildId: guild.id },
        orderBy: { createdAt: 'desc' },
      });
      if (!backup) {
        await editOriginalResponse(token, { content: 'No backups found for this server.' });
        return;
      }
      try {
        const result = await restoreGuildBackup(backup.id);
        const warn = result.warnings.length ? `\n${result.warnings.length} warning(s).` : '';
        await editOriginalResponse(token, {
          content: `Restored ${result.rolesCreated} role(s) and ${result.channelsCreated} channel(s).${warn}`,
        });
      } catch (e) {
        await editOriginalResponse(token, {
          content: `Restore failed: ${e instanceof Error ? e.message : e}`,
        });
      }
    },
  };
}

async function handleBlacklist(
  guildId: string,
  invokerId: string,
  interaction: Interaction,
): Promise<CommandResult> {
  const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
  if (!guild) {
    return { kind: 'immediate', response: ephemeral('This server is not connected to Botport.') };
  }

  const addSub = findOption(getOptions(interaction), 'add') as
    | APIApplicationCommandInteractionDataSubcommandOption
    | undefined;
  const removeSub = findOption(getOptions(interaction), 'remove') as
    | APIApplicationCommandInteractionDataSubcommandOption
    | undefined;
  const active = addSub ?? removeSub;
  if (!active) return { kind: 'immediate', response: ephemeral('Unknown subcommand.') };

  const userOpt = findOption(active.options ?? [], 'user');
  const targetId = userOpt && userOpt.type === ApplicationCommandOptionType.User ? userOpt.value : undefined;
  if (!targetId) return { kind: 'immediate', response: ephemeral('No user given.') };
  const targetUser = interaction.data.resolved?.users?.[targetId];
  const targetName = targetUser?.username ?? targetId;

  if (addSub) {
    const reasonOpt = findOption(addSub.options ?? [], 'reason');
    const reason =
      reasonOpt && reasonOpt.type === ApplicationCommandOptionType.String ? reasonOpt.value : undefined;
    await prisma.blacklistEntry.upsert({
      where: { guildId_discordId: { guildId: guild.id, discordId: targetId } },
      update: { reason },
      create: { guildId: guild.id, discordId: targetId, reason, addedBy: invokerId },
    });
    return { kind: 'immediate', response: ephemeral(`Blacklisted ${targetName}.`) };
  }

  await prisma.blacklistEntry.deleteMany({ where: { guildId: guild.id, discordId: targetId } });
  return { kind: 'immediate', response: ephemeral(`Removed ${targetName} from the blacklist.`) };
}

async function handleInfo(guildId: string, interaction: Interaction): Promise<CommandResult> {
  const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
  if (!guild) return { kind: 'immediate', response: ephemeral('This server is not connected to Botport.') };

  const userOpt = findOption(getOptions(interaction), 'user');
  const targetId = userOpt && userOpt.type === ApplicationCommandOptionType.User ? userOpt.value : undefined;
  if (!targetId) return { kind: 'immediate', response: ephemeral('No user given.') };
  const targetUser = interaction.data.resolved?.users?.[targetId];
  const targetName = targetUser?.username ?? targetId;

  const [latest, passedCount, blacklisted] = await Promise.all([
    prisma.verification.findFirst({ where: { guildId: guild.id, discordId: targetId }, orderBy: { createdAt: 'desc' } }),
    prisma.verification.count({ where: { guildId: guild.id, discordId: targetId, status: 'PASSED' } }),
    prisma.blacklistEntry.findUnique({ where: { guildId_discordId: { guildId: guild.id, discordId: targetId } } }),
  ]);

  return {
    kind: 'immediate',
    response: {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        embeds: [
          {
            title: `Info - ${targetName}`,
            color: blacklisted ? 0xef4444 : 0x5865f2,
            fields: [
              { name: 'Account created', value: snowflakeToDate(targetId).toDateString(), inline: true },
              { name: 'Verified', value: passedCount > 0 ? `Yes (${passedCount}x)` : 'No', inline: true },
              {
                name: 'Last attempt',
                value: latest ? `${latest.status} - ${latest.createdAt.toDateString()}` : 'none',
                inline: true,
              },
              {
                name: 'Blacklisted',
                value: blacklisted ? `Yes${blacklisted.reason ? ` (${blacklisted.reason})` : ''}` : 'No',
              },
            ],
          },
        ],
      },
    },
  };
}

function handleVerifyEmbed(guildId: string, interaction: Interaction): CommandResult {
  const channelId = interaction.channel?.id;
  const token = interaction.token;
  const titleOpt = findOption(getOptions(interaction), 'title');
  const descOpt = findOption(getOptions(interaction), 'description');
  const title = titleOpt && titleOpt.type === ApplicationCommandOptionType.String ? titleOpt.value : undefined;
  const description =
    descOpt && descOpt.type === ApplicationCommandOptionType.String ? descOpt.value : undefined;

  return {
    kind: 'deferred',
    work: async () => {
      if (!channelId) {
        await editOriginalResponse(token, { content: 'Use this in a text channel.' });
        return;
      }
      if (!env.discordBotToken) {
        await editOriginalResponse(token, { content: 'Bot token not configured.' });
        return;
      }
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId }, include: { settings: true } });
      const color = guild?.settings?.verifyPageColor?.replace('#', '');

      const rest = createRest(env.discordBotToken);
      try {
        await postChannelMessage(rest, channelId, {
          embeds: [
            {
              title: title || 'Verify to access this server',
              description:
                description ||
                'Click the button below to verify. We only store your Discord username and that you verified - never your IP, email or device.',
              color: color ? parseInt(color, 16) : 0x5865f2,
            },
          ],
          components: [
            { type: 1, components: [{ type: 2, style: 3, label: 'Verify', custom_id: VERIFY_BUTTON_ID }] },
          ],
        });
        await editOriginalResponse(token, { content: 'Verification message posted.' });
      } catch (e) {
        await editOriginalResponse(token, {
          content: `Could not post message: ${e instanceof Error ? e.message : e}`,
        });
      }
    },
  };
}

