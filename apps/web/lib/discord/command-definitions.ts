import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord-api-types/v10';

/**
 * Slash command schemas, registered with Discord via PUT
 * /applications/{id}/commands. Kept as plain data (no discord.js) since the
 * handlers in commands.ts work off raw interaction payloads too.
 */
export const commandDefinitions = [
  {
    name: 'backup',
    description: 'Create a backup of this server now.',
    default_member_permissions: String(PermissionFlagsBits.ManageGuild),
  },
  {
    name: 'restore',
    description: 'Restore this server from its most recent backup.',
    default_member_permissions: String(PermissionFlagsBits.Administrator),
  },
  {
    name: 'verify-embed',
    description: 'Post the verification message with a Verify button.',
    default_member_permissions: String(PermissionFlagsBits.ManageGuild),
    options: [
      {
        name: 'title',
        description: 'Custom embed title',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: 'description',
        description: 'Custom embed description',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
  {
    name: 'blacklist',
    description: 'Manage the verification blacklist for this server.',
    default_member_permissions: String(PermissionFlagsBits.ManageGuild),
    options: [
      {
        name: 'add',
        description: 'Blacklist a user',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'User to blacklist',
            type: ApplicationCommandOptionType.User,
            required: true,
          },
          {
            name: 'reason',
            description: 'Reason',
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ],
      },
      {
        name: 'remove',
        description: 'Remove a user from the blacklist',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'User to unblacklist',
            type: ApplicationCommandOptionType.User,
            required: true,
          },
        ],
      },
    ],
  },
  {
    name: 'info',
    description: 'Show verification info for a member of this server.',
    default_member_permissions: String(PermissionFlagsBits.ManageGuild),
    options: [
      {
        name: 'user',
        description: 'Member to look up',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
  },
];
