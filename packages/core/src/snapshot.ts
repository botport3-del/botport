import type { DiscordRest } from './rest';
import type {
  GuildSnapshot,
  SnapshotChannel,
  SnapshotOverwrite,
  SnapshotRole,
} from './types';

// Partial shapes of the Discord API responses we consume.
interface RawGuild {
  name: string;
  icon: string | null;
  verification_level: number;
  default_message_notifications: number;
  explicit_content_filter: number;
  afk_timeout: number;
  system_channel_id: string | null;
  afk_channel_id: string | null;
}

interface RawRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  mentionable: boolean;
  managed: boolean;
}

interface RawOverwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

interface RawChannel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id: string | null;
  topic: string | null;
  nsfw: boolean;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  permission_overwrites?: RawOverwrite[];
}

function mapRole(r: RawRole): SnapshotRole {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    hoist: r.hoist,
    position: r.position,
    permissions: r.permissions,
    mentionable: r.mentionable,
    managed: r.managed,
  };
}

function mapOverwrite(o: RawOverwrite): SnapshotOverwrite {
  return { id: o.id, type: o.type, allow: o.allow, deny: o.deny };
}

function mapChannel(c: RawChannel): SnapshotChannel {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    position: c.position,
    parentId: c.parent_id,
    topic: c.topic ?? null,
    nsfw: c.nsfw ?? false,
    bitrate: c.bitrate ?? null,
    userLimit: c.user_limit ?? null,
    rateLimitPerUser: c.rate_limit_per_user ?? null,
    permissionOverwrites: (c.permission_overwrites ?? []).map(mapOverwrite),
  };
}

/** Reads a guild's roles, channels and settings into a serialisable snapshot. */
export async function createSnapshot(rest: DiscordRest, guildId: string): Promise<GuildSnapshot> {
  const [guild, roles, channels] = await Promise.all([
    rest.get<RawGuild>(`/guilds/${guildId}`),
    rest.get<RawRole[]>(`/guilds/${guildId}/roles`),
    rest.get<RawChannel[]>(`/guilds/${guildId}/channels`),
  ]);

  return {
    version: 1,
    takenAt: new Date().toISOString(),
    server: {
      name: guild.name,
      iconHash: guild.icon,
      verificationLevel: guild.verification_level,
      defaultMessageNotifications: guild.default_message_notifications,
      explicitContentFilter: guild.explicit_content_filter,
      afkTimeout: guild.afk_timeout,
      systemChannelId: guild.system_channel_id,
      afkChannelId: guild.afk_channel_id,
    },
    roles: roles.map(mapRole).sort((a, b) => b.position - a.position),
    channels: channels.map(mapChannel).sort((a, b) => a.position - b.position),
  };
}
