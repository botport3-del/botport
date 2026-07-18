'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type BackupSchedule } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildManage } from '@/lib/guild-access';

export interface SettingsState {
  ok?: string;
  error?: string;
}

const SCHEDULES: BackupSchedule[] = ['OFF', 'DAILY', 'HOURLY'];

export async function saveGeneralSettings(
  guildId: string,
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  await requireGuildManage(user.id, guildId);

  const backupSchedule = formData.get('backupSchedule') as BackupSchedule;
  const data = {
    backupSchedule: SCHEDULES.includes(backupSchedule) ? backupSchedule : 'DAILY',
    blockKnownVpns: formData.get('blockKnownVpns') === 'on',
    joinRateLimit: Math.max(0, Number(formData.get('joinRateLimit')) || 0),
  };

  await prisma.guildSettings.upsert({
    where: { guildId },
    update: data,
    create: { guildId, ...data },
  });

  revalidatePath(`/dashboard/servers/${guildId}/settings`);
  return { ok: 'Settings saved.' };
}

export async function addBlacklist(
  guildId: string,
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  await requireGuildManage(user.id, guildId);

  const discordId = (formData.get('discordId') as string)?.trim();
  const reason = (formData.get('reason') as string)?.trim() || null;
  if (!/^\d{5,}$/.test(discordId ?? '')) {
    return { error: 'Enter a valid Discord user ID.' };
  }

  try {
    await prisma.blacklistEntry.create({
      data: { guildId, discordId, reason, addedBy: user.discordId },
    });
  } catch {
    return { error: 'That user is already blacklisted.' };
  }

  revalidatePath(`/dashboard/servers/${guildId}/settings`);
  return { ok: `Blacklisted ${discordId}.` };
}

export async function removeBlacklist(guildId: string, entryId: string): Promise<void> {
  const user = await requireUser();
  await requireGuildManage(user.id, guildId);
  await prisma.blacklistEntry.deleteMany({ where: { id: entryId, guildId } });
  revalidatePath(`/dashboard/servers/${guildId}/settings`);
}
