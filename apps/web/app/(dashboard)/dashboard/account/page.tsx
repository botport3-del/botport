import { requireUser } from '@/lib/auth';
import { userAvatarUrl } from '@/lib/discord';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser();
  const avatar = userAvatarUrl(user.discordId, user.avatar);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-14 w-14 rounded-full" />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand/30 text-xl font-semibold">
              {(user.globalName || user.username).charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <div className="font-medium">{user.globalName || user.username}</div>
            <div className="text-sm text-slate-400">@{user.username}</div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-500">Discord ID</dt>
          <dd className="font-mono">{user.discordId}</dd>
          <dt className="text-slate-500">Email</dt>
          <dd>{user.email || '-'}</dd>
          <dt className="text-slate-500">Member since</dt>
          <dd>{user.createdAt.toLocaleDateString()}</dd>
        </dl>
      </div>

      <div className="card">
        <h2 className="font-semibold">Data &amp; privacy</h2>
        <p className="mt-2 text-sm text-slate-400">
          Devorju stores only what you see here plus your connected servers&apos; configuration and
          backups. We never collect members&apos; IP addresses or device data, and we never store
          OAuth tokens to add members to other servers.
        </p>
        <form action="/api/auth/logout" method="post" className="mt-4">
          <button type="submit" className="btn-ghost">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
