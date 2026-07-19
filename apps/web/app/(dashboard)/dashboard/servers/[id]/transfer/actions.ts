'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { runBatch } from '@/lib/transfer';

export interface ActionState {
  ok?: string;
  error?: string;
  batchId?: string;
}

/** Create a new transfer batch and send DM/PUT invitations for the selected members. */
export async function createTransfer(
  guildId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, guildId);

  const targetGuildId = ((formData.get('targetGuildId') as string) || '').trim();
  const inviteUrl = ((formData.get('inviteUrl') as string) || '').trim();
  const message = ((formData.get('message') as string) || '').trim() || null;
  const memberIdsRaw = (formData.get('memberIds') as string) || '';
  const memberIds = memberIdsRaw.split(',').filter(Boolean);

  if (!/^\d{15,20}$/.test(targetGuildId)) {
    return { error: 'Enter a valid target Discord server ID.' };
  }
  if (memberIds.length === 0) {
    return { error: 'Select at least one member.' };
  }

  const batch = await prisma.transferBatch.create({
    data: {
      guildId: guild.id,
      targetGuildId,
      inviteUrl: inviteUrl || `https://discord.gg/${targetGuildId}`,
      message,
      createdBy: user.discordId,
      invitations: {
        create: memberIds.map((discordId) => ({ discordId })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      guildId: guild.id,
      actorId: user.id,
      action: 'transfer.create',
      meta: { batchId: batch.id, count: memberIds.length, targetGuildId },
    },
  });

  // Kick off processing (best-effort — user can also click Retry)
  runBatch(batch.id).catch(() => {});

  revalidatePath(`/dashboard/servers/${guildId}/transfer`);
  return { ok: `Transfer started for ${memberIds.length} members.`, batchId: batch.id };
}

export async function retryFailed(
  guildId: string,
  batchId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  await requireGuildAccess(user.id, guildId);
  // Reset failed to PENDING and run again
  await prisma.transferInvitation.updateMany({
    where: { batchId, status: { in: ['FAILED', 'DMS_DISABLED'] } },
    data: { status: 'PENDING' },
  });
  const { processed } = await runBatch(batchId);
  revalidatePath(`/dashboard/servers/${guildId}/transfer`);
  return { ok: `Retried ${processed} invitation(s).`, batchId };
}
