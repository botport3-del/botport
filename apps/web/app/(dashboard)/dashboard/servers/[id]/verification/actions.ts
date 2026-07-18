'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';

export interface SettingsState {
  ok?: string;
  error?: string;
}

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
