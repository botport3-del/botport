import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { ServerTabs } from '@/components/dashboard/server-tabs';

export const dynamic = 'force-dynamic';

export default async function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {guild.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={guild.iconUrl} alt="" className="h-10 w-10 rounded-full" />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/30 font-semibold">
            {guild.name.charAt(0).toUpperCase()}
          </span>
        )}
        <h1 className="text-xl font-semibold">{guild.name}</h1>
      </div>
      <ServerTabs guildId={guild.id} />
      <div>{children}</div>
    </div>
  );
}
