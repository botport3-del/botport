import type { DiscordRest } from './rest';
import type {
  GuildSnapshot,
  RestoreOptions,
  RestoreResult,
  SnapshotChannel,
  SnapshotOverwrite,
} from './types';

const CATEGORY_TYPE = 4;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Rebuilds a guild's structure from a snapshot.
 *
 * Order: roles (low→high position) → categories → channels, remapping
 * permission overwrites and parents from source IDs to the newly created ones.
 * Managed roles and the source `@everyone` are not recreated; `@everyone`
 * overwrites are remapped onto the target guild's default role.
 *
 * This is additive — it creates missing structure rather than deleting the
 * live server, so a failed restore can never wipe a server.
 */
export async function restoreSnapshot(
  rest: DiscordRest,
  guildId: string,
  snapshot: GuildSnapshot,
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  const { restoreRoles = true, restoreChannels = true, restoreSettings = true } = options;
  const warnings: string[] = [];

  // old role/channel id -> new id
  const roleIdMap = new Map<string, string>();
  const everyone = snapshot.roles.find((r) => r.name === '@everyone');
  if (everyone) roleIdMap.set(everyone.id, guildId); // target @everyone === guild id

  let rolesCreated = 0;
  if (restoreRoles) {
    const toCreate = snapshot.roles
      .filter((r) => r.name !== '@everyone' && !r.managed)
      .sort((a, b) => a.position - b.position);
    for (const role of toCreate) {
      try {
        const created = await rest.post<{ id: string }>(`/guilds/${guildId}/roles`, {
          name: role.name,
          permissions: role.permissions,
          color: role.color,
          hoist: role.hoist,
          mentionable: role.mentionable,
        });
        roleIdMap.set(role.id, created.id);
        rolesCreated++;
      } catch (e) {
        warnings.push(`Role "${role.name}" could not be created: ${errMsg(e)}`);
      }
    }
  }

  function remapOverwrites(overwrites: SnapshotOverwrite[]) {
    const out: { id: string; type: number; allow: string; deny: string }[] = [];
    for (const ow of overwrites) {
      if (ow.type === 0) {
        const mapped = roleIdMap.get(ow.id);
        if (!mapped) continue; // role not recreated → drop the overwrite
        out.push({ id: mapped, type: 0, allow: ow.allow, deny: ow.deny });
      } else {
        // member overwrite — user ids are global, keep as-is
        out.push({ id: ow.id, type: 1, allow: ow.allow, deny: ow.deny });
      }
    }
    return out;
  }

  function channelPayload(ch: SnapshotChannel, parentId: string | null) {
    return {
      name: ch.name,
      type: ch.type,
      topic: ch.topic ?? undefined,
      nsfw: ch.nsfw,
      bitrate: ch.bitrate ?? undefined,
      user_limit: ch.userLimit ?? undefined,
      rate_limit_per_user: ch.rateLimitPerUser ?? undefined,
      parent_id: parentId ?? undefined,
      permission_overwrites: remapOverwrites(ch.permissionOverwrites),
    };
  }

  let channelsCreated = 0;
  if (restoreChannels) {
    const channelIdMap = new Map<string, string>();
    const categories = snapshot.channels
      .filter((c) => c.type === CATEGORY_TYPE)
      .sort((a, b) => a.position - b.position);
    const others = snapshot.channels
      .filter((c) => c.type !== CATEGORY_TYPE)
      .sort((a, b) => a.position - b.position);

    for (const cat of categories) {
      try {
        const created = await rest.post<{ id: string }>(
          `/guilds/${guildId}/channels`,
          channelPayload(cat, null),
        );
        channelIdMap.set(cat.id, created.id);
        channelsCreated++;
      } catch (e) {
        warnings.push(`Category "${cat.name}" could not be created: ${errMsg(e)}`);
      }
    }

    for (const ch of others) {
      const parentId = ch.parentId ? (channelIdMap.get(ch.parentId) ?? null) : null;
      try {
        const created = await rest.post<{ id: string }>(
          `/guilds/${guildId}/channels`,
          channelPayload(ch, parentId),
        );
        channelIdMap.set(ch.id, created.id);
        channelsCreated++;
      } catch (e) {
        warnings.push(`Channel "${ch.name}" could not be created: ${errMsg(e)}`);
      }
    }
  }

  let settingsApplied = false;
  if (restoreSettings) {
    try {
      await rest.patch(`/guilds/${guildId}`, {
        name: snapshot.server.name,
        verification_level: snapshot.server.verificationLevel,
        default_message_notifications: snapshot.server.defaultMessageNotifications,
        explicit_content_filter: snapshot.server.explicitContentFilter,
        afk_timeout: snapshot.server.afkTimeout,
      });
      settingsApplied = true;
    } catch (e) {
      warnings.push(`Server settings could not be applied: ${errMsg(e)}`);
    }
  }

  return { rolesCreated, channelsCreated, settingsApplied, warnings };
}
