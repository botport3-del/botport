import type { DiscordRest } from './rest';

/** Adds a single role to a guild member. */
export async function addRole(
  rest: DiscordRest,
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  await rest.put(`/guilds/${guildId}/members/${userId}/roles/${roleId}`);
}

/** Adds multiple roles to a guild member, ignoring blank ids. */
export async function addRoles(
  rest: DiscordRest,
  guildId: string,
  userId: string,
  roleIds: string[],
): Promise<void> {
  for (const roleId of roleIds.filter(Boolean)) {
    await addRole(rest, guildId, userId, roleId);
  }
}

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface MessageEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: EmbedField[];
  timestamp?: string;
}

/** Posts a message (optionally with embeds/components) to a channel. */
export async function postChannelMessage(
  rest: DiscordRest,
  channelId: string,
  payload: { content?: string; embeds?: MessageEmbed[]; components?: unknown[] },
): Promise<void> {
  await rest.post(`/channels/${channelId}/messages`, payload);
}
