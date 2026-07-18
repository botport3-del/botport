'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type StaffRole } from 'db';
import { requireUser } from '@/lib/auth';
import { requireGuildAccess, requireGuildManage } from '@/lib/guild-access';

export interface TeamState {
  ok?: string;
  error?: string;
}

const VALID_ROLES: StaffRole[] = ['ADMIN', 'MOD'];

export async function inviteStaff(
  guildId: string,
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  const user = await requireUser();
  await requireGuildAccess(user.id, guildId);
  await requireGuildManage(user.id, guildId);

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const role = formData.get('role') as StaffRole;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: 'Enter a valid email address.' };
  }
  if (!VALID_ROLES.includes(role)) {
    return { error: 'Choose a valid role.' };
  }

  const existingUser = await prisma.user.findFirst({ where: { email } });

  try {
    await prisma.staffMember.create({
      data: {
        guildId,
        email,
        userId: existingUser?.id ?? null,
        role,
        invitedBy: user.discordId,
        permissions: role === 'ADMIN' ? ['backups', 'verification', 'team', 'settings'] : ['verification'],
      },
    });
  } catch {
    return { error: 'That email is already invited to this server.' };
  }

  await prisma.auditLog.create({
    data: { guildId, actorId: user.id, action: 'staff.invite', meta: { email, role } },
  });

  revalidatePath(`/dashboard/servers/${guildId}/team`);
  return { ok: `Invited ${email} as ${role}.` };
}

export async function removeStaff(guildId: string, staffId: string): Promise<void> {
  const user = await requireUser();
  await requireGuildManage(user.id, guildId);
  const staff = await prisma.staffMember.findFirst({ where: { id: staffId, guildId } });
  if (!staff) return;

  await prisma.staffMember.delete({ where: { id: staffId } });
  await prisma.auditLog.create({
    data: { guildId, actorId: user.id, action: 'staff.remove', meta: { email: staff.email } },
  });
  revalidatePath(`/dashboard/servers/${guildId}/team`);
}
