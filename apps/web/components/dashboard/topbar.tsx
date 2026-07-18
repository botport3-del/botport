import { userAvatarUrl } from '@/lib/discord';
import type { User } from 'db';

export function Topbar({ user }: { user: User }) {
  const avatar = userAvatarUrl(user.discordId, user.avatar);
  const name = user.globalName || user.username;

  return (
    <header className="flex h-16 items-center justify-between border-b border-surface-border px-5">
      <div className="text-sm text-slate-400">Dashboard</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand/30 text-sm">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-sm">{name}</span>
        </div>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="btn-ghost text-xs">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
