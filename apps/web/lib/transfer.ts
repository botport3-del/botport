import 'server-only';
import { prisma } from 'db';
import { env } from './env';
import { decryptSecret, encryptSecret } from './crypto';

const DISCORD_API = 'https://discord.com/api/v10';

async function refreshAccessToken(
  encryptedRefresh: string,
): Promise<{ access: string; newRefresh: string } | null> {
  const refresh = decryptSecret(encryptedRefresh);
  if (!refresh) return null;
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.discordClientId,
      client_secret: env.discordClientSecret,
      grant_type: 'refresh_token',
      refresh_token: refresh,
    }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token: string; refresh_token: string };
  return { access: j.access_token, newRefresh: j.refresh_token };
}

export type SendOutcome =
  | 'JOINED'
  | 'ALREADY_MEMBER'
  | 'DMS_DISABLED'
  | 'NO_CONSENT'
  | 'FAILED';

/**
 * Adds a verified member to the target guild via `PUT /guilds/{id}/members/{user}`
 * using their stored guilds.join refresh token. Discord automatically shows
 * the member a notification that they were added.
 *
 * Returns the outcome so the caller can update the invitation record.
 */
export async function addMemberToGuild(
  verificationId: string,
  targetGuildId: string,
  restoreRoleIds: string[] = [],
): Promise<{ outcome: SendOutcome; error?: string }> {
  const v = await prisma.verification.findUnique({ where: { id: verificationId } });
  if (!v || !v.oauthRefreshToken) return { outcome: 'NO_CONSENT' };
  const refreshed = await refreshAccessToken(v.oauthRefreshToken);
  if (!refreshed) return { outcome: 'NO_CONSENT', error: 'refresh failed' };

  // Persist rotated refresh token
  await prisma.verification.update({
    where: { id: v.id },
    data: { oauthRefreshToken: encryptSecret(refreshed.newRefresh) },
  });

  if (!env.discordBotToken) return { outcome: 'FAILED', error: 'no bot token' };

  const body: Record<string, unknown> = { access_token: refreshed.access };
  if (restoreRoleIds.length > 0) body.roles = restoreRoleIds;

  const res = await fetch(`${DISCORD_API}/guilds/${targetGuildId}/members/${v.discordId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${env.discordBotToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 201) return { outcome: 'JOINED' };
  if (res.status === 204) return { outcome: 'ALREADY_MEMBER' };
  const text = await res.text().catch(() => '');
  return { outcome: 'FAILED', error: `${res.status}: ${text.substring(0, 200)}` };
}

/** Runs one transfer batch synchronously against Discord, updating records. */
export async function runBatch(batchId: string, restoreRoles = true) {
  const batch = await prisma.transferBatch.findUnique({
    where: { id: batchId },
    include: { invitations: true },
  });
  if (!batch) return { processed: 0 };

  let processed = 0;
  for (const inv of batch.invitations) {
    if (inv.status === 'JOINED') continue;

    const v = await prisma.verification.findFirst({
      where: { guildId: batch.guildId, discordId: inv.discordId, status: 'PASSED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!v?.oauthRefreshToken) {
      await prisma.transferInvitation.update({
        where: { id: inv.id },
        data: {
          status: 'FAILED',
          lastError: 'No stored guilds.join consent',
          attempts: { increment: 1 },
        },
      });
      continue;
    }

    const roles = restoreRoles ? v.memberRoleIds : [];
    const { outcome, error } = await addMemberToGuild(v.id, batch.targetGuildId, roles);
    const now = new Date();
    const status =
      outcome === 'JOINED' || outcome === 'ALREADY_MEMBER'
        ? 'JOINED'
        : outcome === 'NO_CONSENT'
          ? 'FAILED'
          : 'FAILED';

    await prisma.transferInvitation.update({
      where: { id: inv.id },
      data: {
        status,
        sentAt: now,
        joinedAt: outcome === 'JOINED' || outcome === 'ALREADY_MEMBER' ? now : null,
        lastError: error ?? null,
        attempts: { increment: 1 },
      },
    });
    processed++;

    // Be nice to the Discord API — one add per ~500ms max
    await new Promise((r) => setTimeout(r, 500));
  }
  return { processed };
}
