import { PrismaClient, BackupType, StaffRole, VerificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo data…');

  const user = await prisma.user.upsert({
    where: { discordId: '100000000000000001' },
    update: {},
    create: {
      discordId: '100000000000000001',
      username: 'demo-owner',
      globalName: 'Demo Owner',
      email: 'demo@example.com',
    },
  });

  const guild = await prisma.guild.upsert({
    where: { discordId: '200000000000000001' },
    update: {},
    create: {
      discordId: '200000000000000001',
      name: 'Demo Community',
      ownerUserId: user.id,
      settings: {
        create: {
          verifyEnabled: true,
          captchaEnabled: true,
          minAccountAgeDays: 3,
          verifyPageTitle: 'Welcome to Demo Community',
        },
      },
    },
  });

  await prisma.backup.create({
    data: {
      guildId: guild.id,
      type: BackupType.MANUAL,
      label: 'Initial demo backup',
      createdBy: user.discordId,
      data: {
        server: { name: 'Demo Community', verificationLevel: 1 },
        roles: [
          { name: '@everyone', color: 0, position: 0 },
          { name: 'Member', color: 3447003, position: 1 },
        ],
        channels: [
          { name: 'general', type: 'GUILD_TEXT', position: 0 },
          { name: 'Voice', type: 'GUILD_VOICE', position: 1 },
        ],
      },
    },
  });

  await prisma.verification.create({
    data: {
      guildId: guild.id,
      discordId: '300000000000000001',
      username: 'newbie',
      status: VerificationStatus.PASSED,
      method: 'captcha',
      consentGiven: true,
      completedAt: new Date(),
    },
  });

  await prisma.staffMember.upsert({
    where: { guildId_email: { guildId: guild.id, email: 'demo@example.com' } },
    update: {},
    create: {
      guildId: guild.id,
      userId: user.id,
      email: 'demo@example.com',
      role: StaffRole.OWNER,
      permissions: ['backups', 'verification', 'team', 'settings'],
    },
  });

  console.log('Seed complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
