import { describe, it, expect } from 'vitest';
import type { DiscordRest } from './rest';
import { createSnapshot } from './snapshot';
import { restoreSnapshot } from './restore';
import type { GuildSnapshot } from './types';

const SOURCE_GUILD = 'g1';

function readMock(): DiscordRest {
  return {
    async get<T>(path: string): Promise<T> {
      if (path === `/guilds/${SOURCE_GUILD}`) {
        return {
          name: 'Source Server',
          icon: 'abc',
          verification_level: 2,
          default_message_notifications: 0,
          explicit_content_filter: 1,
          afk_timeout: 300,
          system_channel_id: null,
          afk_channel_id: null,
        } as T;
      }
      if (path === `/guilds/${SOURCE_GUILD}/roles`) {
        return [
          { id: 'g1', name: '@everyone', color: 0, hoist: false, position: 0, permissions: '0', mentionable: false, managed: false },
          { id: 'r1', name: 'Member', color: 3447003, hoist: true, position: 1, permissions: '1024', mentionable: true, managed: false },
          { id: 'rbot', name: 'BotRole', color: 0, hoist: false, position: 2, permissions: '8', mentionable: false, managed: true },
        ] as T;
      }
      if (path === `/guilds/${SOURCE_GUILD}/channels`) {
        return [
          { id: 'cat1', name: 'General', type: 4, position: 0, parent_id: null, topic: null, nsfw: false, permission_overwrites: [] },
          {
            id: 'ch1', name: 'chat', type: 0, position: 1, parent_id: 'cat1', topic: 'hi', nsfw: false, rate_limit_per_user: 5,
            permission_overwrites: [
              { id: 'g1', type: 0, allow: '0', deny: '1024' },
              { id: 'r1', type: 0, allow: '1024', deny: '0' },
              { id: 'u1', type: 1, allow: '2048', deny: '0' },
            ],
          },
        ] as T;
      }
      throw new Error(`unexpected GET ${path}`);
    },
    async post() {
      throw new Error('read mock cannot post');
    },
    async patch() {
      throw new Error('read mock cannot patch');
    },
    async put() {},
    async delete() {},
  };
}

describe('createSnapshot', () => {
  it('captures server, roles and channels', async () => {
    const snap = await createSnapshot(readMock(), SOURCE_GUILD);
    expect(snap.version).toBe(1);
    expect(snap.server.name).toBe('Source Server');
    expect(snap.server.verificationLevel).toBe(2);
    expect(snap.roles.map((r) => r.name)).toContain('Member');
    const chat = snap.channels.find((c) => c.name === 'chat');
    expect(chat?.parentId).toBe('cat1');
    expect(chat?.rateLimitPerUser).toBe(5);
    expect(chat?.permissionOverwrites).toHaveLength(3);
  });
});

interface CreatedChannel {
  path: string;
  body: Record<string, unknown>;
  id: string;
}

function writeMock() {
  const createdChannels: CreatedChannel[] = [];
  const createdRoles: { name: string; id: string }[] = [];
  let roleCounter = 0;
  let chanCounter = 0;
  let patched = false;

  const rest: DiscordRest = {
    async get<T>(): Promise<T> {
      throw new Error('write mock cannot get');
    },
    async post<T>(path: string, body: unknown): Promise<T> {
      const b = body as Record<string, unknown>;
      if (path.endsWith('/roles')) {
        const id = `new-role-${++roleCounter}`;
        createdRoles.push({ name: String(b.name), id });
        return { id } as T;
      }
      if (path.endsWith('/channels')) {
        const id = `new-chan-${++chanCounter}`;
        createdChannels.push({ path, body: b, id });
        return { id } as T;
      }
      throw new Error(`unexpected POST ${path}`);
    },
    async patch<T>(): Promise<T> {
      patched = true;
      return undefined as T;
    },
    async put() {},
    async delete() {},
  };

  return { rest, createdChannels, createdRoles, get patched() {
    return patched;
  } };
}

describe('restoreSnapshot', () => {
  it('recreates roles/channels and remaps overwrites & parents', async () => {
    const snap: GuildSnapshot = await createSnapshot(readMock(), SOURCE_GUILD);
    const mock = writeMock();

    const result = await restoreSnapshot(mock.rest, 'g2', snap);

    // Managed role and @everyone are skipped; only "Member" is recreated.
    expect(result.rolesCreated).toBe(1);
    expect(mock.createdRoles.map((r) => r.name)).toEqual(['Member']);

    // Category + text channel created.
    expect(result.channelsCreated).toBe(2);

    const chat = mock.createdChannels.find((c) => c.body.name === 'chat')!;
    // Parent remapped to the newly created category id.
    const category = mock.createdChannels.find((c) => c.body.name === 'General')!;
    expect(chat.body.parent_id).toBe(category.id);

    // Overwrites: @everyone -> target guild id, role -> new role id, member kept.
    const ows = chat.body.permission_overwrites as { id: string; type: number }[];
    const everyone = ows.find((o) => o.type === 0 && o.id === 'g2');
    const memberRole = ows.find((o) => o.type === 0 && o.id === 'new-role-1');
    const member = ows.find((o) => o.type === 1 && o.id === 'u1');
    expect(everyone).toBeTruthy();
    expect(memberRole).toBeTruthy();
    expect(member).toBeTruthy();

    expect(result.settingsApplied).toBe(true);
    expect(mock.patched).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('can skip roles and settings via options', async () => {
    const snap = await createSnapshot(readMock(), SOURCE_GUILD);
    const mock = writeMock();
    const result = await restoreSnapshot(mock.rest, 'g2', snap, {
      restoreRoles: false,
      restoreSettings: false,
    });
    expect(result.rolesCreated).toBe(0);
    expect(result.settingsApplied).toBe(false);
    // Role overwrites are dropped when roles are not recreated (except @everyone).
    const chat = mock.createdChannels.find((c) => c.body.name === 'chat')!;
    const ows = chat.body.permission_overwrites as { id: string; type: number }[];
    expect(ows.find((o) => o.id === 'g2')).toBeTruthy(); // @everyone still mapped
    expect(ows.find((o) => o.type === 0 && o.id.startsWith('new-role'))).toBeFalsy();
  });
});
