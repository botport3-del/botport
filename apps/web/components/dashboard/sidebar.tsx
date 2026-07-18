'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: '🏠', exact: true },
  { href: '/dashboard/servers', label: 'Servers', icon: '🗂️' },
  { href: '/dashboard/account', label: 'Account', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-surface-border bg-surface-raised md:block">
      <div className="flex h-16 items-center gap-2 border-b border-surface-border px-5 font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">B</span>
        Botport
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-brand/15 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
