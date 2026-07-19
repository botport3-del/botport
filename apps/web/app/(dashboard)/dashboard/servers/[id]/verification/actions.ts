'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { postChannelMessage } from '@/lib/discord/bot-api';

export interface SettingsState {
  ok?: string;
  error?: string;
}

const VERIFY_BUTTON_ID = 'verify:start';

function parseRoleIds(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d{5,}$/.test(s));
}

export async function saveVerificationSettings(
  guildId: string,
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, guildId);

  const data = {
    verifyEnabled: formData.get('verifyEnabled') === 'on',
    captchaEnabled: formData.get('captchaEnabled') === 'on',
    requireOAuthIdentify: formData.get('requireOAuthIdentify') === 'on',
    verifyRoleId: (formData.get('verifyRoleId') as string)?.trim() || null,
    autoRoleIds: parseRoleIds((formData.get('autoRoleIds') as string) ?? ''),
    minAccountAgeDays: Math.max(0, Number(formData.get('minAccountAgeDays')) || 0),
    logChannelId: (formData.get('logChannelId') as string)?.trim() || null,
    verifyPageTitle: (formData.get('verifyPageTitle') as string)?.trim() || null,
    verifyPageColor: (formData.get('verifyPageColor') as string)?.trim() || '#5865F2',
  };

  await prisma.guildSettings.upsert({
    where: { guildId: guild.id },
    update: data,
    create: { guildId: guild.id, ...data },
  });

  revalidatePath(`/dashboard/servers/${guildId}/verification`);
  return { ok: 'Verification settings saved.' };
}

/**
 * Posts the branded verify embed with a Verify button into the chosen channel,
 * driven entirely from the dashboard - no /verify-embed slash command required.
 */
export async function postVerifyEmbed(
  guildId: string,
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, guildId);
  const settings = guild.settings;

  const channelId = ((formData.get('channelId') as string) || '').trim();
  const title = ((formData.get('title') as string) || '').trim();
  const description = ((formData.get('description') as string) || '').trim();

  if (!/^\d{15,20}$/.test(channelId)) {
    return { error: 'Choose a channel to post the embed in.' };
  }
  if (!settings?.verifyEnabled) {
    return {
      error: 'Turn on verification first (top toggle), then post the embed.',
    };
  }

  const colorHex = (settings.verifyPageColor ?? '#5865F2').replace('#', '');
  const color = parseInt(colorHex, 16) || 0x5865f2;

  const embed = {
    title: title || settings.verifyPageTitle || 'Verify to access this server',
    description:
      description ||
      "Click the button below to verify. You'll go through Discord's official consent screen.",
    color,
  };
  const components = [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: 'Verify', custom_id: VERIFY_BUTTON_ID },
      ],
    },
  ];

  const result = await postChannelMessage(channelId, { embeds: [embed], components });
  if (!result.ok) return { error: `Discord: ${result.error}` };

  await prisma.auditLog.create({
    data: {
      guildId: guild.id,
      actorId: user.id,
      action: 'verify.post_embed',
      meta: { channelId, messageId: result.messageId },
    },
  });

  revalidatePath(`/dashboard/servers/${guildId}/verification`);
  return { ok: 'Verify embed posted.' };
}
