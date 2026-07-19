import { env } from './env';

const DISCORD_API = 'https://discord.com/api/v10';

/** Discord permission bit for "Manage Server". */
export const MANAGE_GUILD = 1n << 5n;

/** Permissions the bot requests when invited (Administrator-lite management set). */
const BOT_PERMISSIONS =
  (1n << 3n) | // Administrator — simplest for a management bot; can be tightened later
  0n;

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  email: string | null;
}

export interface DiscordGuildSummary {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.discordClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email guilds',
    state,
    prompt: 'consent',
  });
  return `${DISCORD_API}/oauth2/authorize?${params.toString()}`;
}

export function botInviteUrl(guildId?: string): string {
  const params = new URLSearchParams({
    client_id: env.discordClientId,
    scope: 'bot applications.commands',
    permissions: BOT_PERMISSIONS.toString(),
  });
  if (guildId) params.set('guild_id', guildId);
  return `${DISCORD_API.replace('/api/v10', '')}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string }> {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.discordClientId,
      client_secret: env.discordClientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed: ${res.status}`);
  return res.json();
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Discord user: ${res.status}`);
  return res.json();
}

export async function fetchManageableGuilds(accessToken: string): Promise<DiscordGuildSummary[]> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch guilds: ${res.status}`);
  const guilds: DiscordGuildSummary[] = await res.json();
  return guilds.filter((g) => g.owner || (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD);
}

export function guildIconUrl(guildId: string, icon: string | null): string | null {
  if (!icon) return null;
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.png`;
}

export function userAvatarUrl(userId: string, avatar: string | null): string | null {
  if (!avatar) return null;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
}
