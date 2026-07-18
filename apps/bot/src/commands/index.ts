import type { ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import type { SlashCommandBuilder } from 'discord.js';
import * as backup from './backup.js';
import * as restore from './restore.js';
import * as verifyEmbed from './verify-embed.js';

export interface BotCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands: BotCommand[] = [backup, restore, verifyEmbed];

export const commandMap = new Map<string, BotCommand>(commands.map((c) => [c.data.name, c]));
