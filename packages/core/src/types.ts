/**
 * Serialisable snapshot of a Discord server's structure.
 * Only structural data is captured — never member PII, messages or tokens.
 */
export interface GuildSnapshot {
  version: 1;
  takenAt: string; // ISO timestamp
  server: SnapshotServer;
  roles: SnapshotRole[];
  channels: SnapshotChannel[];
}

export interface SnapshotServer {
  name: string;
  iconHash: string | null;
  verificationLevel: number;
  defaultMessageNotifications: number;
  explicitContentFilter: number;
  afkTimeout: number;
  systemChannelId: string | null;
  afkChannelId: string | null;
}

export interface SnapshotRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  mentionable: boolean;
  /** Managed roles (bot/integration/booster) are recorded but skipped on restore. */
  managed: boolean;
}

export interface SnapshotOverwrite {
  id: string; // role or member id (in the source guild)
  type: number; // 0 = role, 1 = member
  allow: string;
  deny: string;
}

export interface SnapshotChannel {
  id: string;
  name: string;
  type: number; // Discord channel type
  position: number;
  parentId: string | null;
  topic: string | null;
  nsfw: boolean;
  bitrate: number | null;
  userLimit: number | null;
  rateLimitPerUser: number | null;
  permissionOverwrites: SnapshotOverwrite[];
}

export interface RestoreOptions {
  /** Recreate roles from the snapshot (default true). */
  restoreRoles?: boolean;
  /** Recreate channels from the snapshot (default true). */
  restoreChannels?: boolean;
  /** Apply server-level settings (name, verification level, …) (default true). */
  restoreSettings?: boolean;
}

export interface RestoreResult {
  rolesCreated: number;
  channelsCreated: number;
  settingsApplied: boolean;
  warnings: string[];
}
