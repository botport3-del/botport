'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { createGuildBackup, restoreGuildBackup, BackupError } from '@/lib/backups';

export interface ActionState {
  ok?: string;
  error?: string;
}

export async function createBackupAction(
  guildId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, guildId);
  try {
    await createGuildBackup(guild.id, { type: 'MANUAL', createdBy: user.discordId });
    revalidatePath(`/dashboard/servers/${guildId}/backups`);
    return { ok: 'Backup created.' };
  } catch (e) {
    return { error: e instanceof BackupError ? e.message : 'Failed to create backup.' };
  }
}

export async function restoreBackupAction(
  guildId: string,
  backupId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  await requireGuildAccess(user.id, guildId);
  const backup = await prisma.backup.findFirst({ where: { id: backupId, guildId } });
  if (!backup) return { error: 'Backup not found.' };
  try {
    const result = await restoreGuildBackup(backupId);
    revalidatePath(`/dashboard/servers/${guildId}/backups`);
    const warn = result.warnings.length ? ` (${result.warnings.length} warning(s))` : '';
    return {
      ok: `Restored ${result.rolesCreated} role(s) and ${result.channelsCreated} channel(s)${warn}.`,
    };
  } catch (e) {
    return { error: e instanceof BackupError ? e.message : 'Failed to restore backup.' };
  }
}

export async function deleteBackupAction(
  guildId: string,
  backupId: string,
): Promise<void> {
  const user = await requireUser();
  await requireGuildAccess(user.id, guildId);
  await prisma.backup.deleteMany({ where: { id: backupId, guildId } });
  revalidatePath(`/dashboard/servers/${guildId}/backups`);
}
