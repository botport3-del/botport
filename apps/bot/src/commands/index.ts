import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import * as backup from './backup.js';
import * as restore from './restore.js';
import * as verifyEmbed from './verify-embed.js';
import * as blacklist from './blacklist.js';
import * as info from './info.js';

export interface BotCommand {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands: BotCommand[] = [backup, restore, verifyEmbed, blacklist, info];

export const commandMap = new Map<string, BotCommand>(commands.map((c) => [c.data.name, c]));
