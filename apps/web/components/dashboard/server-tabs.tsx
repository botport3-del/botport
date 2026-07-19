'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ServerTabs({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/servers/${guildId}`;
  const tabs = [
    { href: base, label: 'Overview', exact: true },
    { href: `${base}/structure`, label: 'Roles & channels' },
    { href: `${base}/members`, label: 'Members' },
    { href: `${base}/transfer`, label: 'Transfer' },
    { href: `${base}/backups`, label: 'Backups' },
    { href: `${base}/verification`, label: 'Verification' },
    { href: `${base}/logs`, label: 'Logs' },
    { href: `${base}/stats`, label: 'Stats' },
    { href: `${base}/audit`, label: 'Audit' },
    { href: `${base}/team`, label: 'Team' },
    { href: `${base}/settings`, label: 'Settings' },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-surface-border">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors ${
              active
                ? 'border-brand text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
