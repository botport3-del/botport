import 'server-only';
import { env } from '@/lib/env';

const DISCORD_API = 'https://discord.com/api/v10';

export interface BotChannel {
  id: string;
  name: string;
  type: number; // 0 text, 2 voice, 4 category, 5 announcement, 15 forum
  parentId: string | null;
  position: number;
}

/** Lists channels of a guild via the bot token. */
export async function listGuildChannels(discordGuildId: string): Promise<BotChannel[]> {
  if (!env.discordBotToken) return [];
  const res = await fetch(`${DISCORD_API}/guilds/${discordGuildId}/channels`, {
    headers: { Authorization: `Bot ${env.discordBotToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const raw = (await res.json()) as Array<{
    id: string;
    name: string;
    type: number;
    parent_id: string | null;
    position: number;
  }>;
  return raw.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    parentId: c.parent_id ?? null,
    position: c.position,
  }));
}

/** Posts a message to a channel via the bot. */
export async function postChannelMessage(
  channelId: string,
  payload: { content?: string; embeds?: unknown[]; components?: unknown[] },
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  if (!env.discordBotToken) return { ok: false, error: 'Bot token not configured' };
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.discordBotToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, error: `${res.status}: ${text.slice(0, 200)}` };
  }
  const j = (await res.json()) as { id: string };
  return { ok: true, messageId: j.id };
}
