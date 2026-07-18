import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-surface-border py-10 text-sm text-slate-400">
      <div className="container-page flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p>© {new Date().getFullYear()} Botport. Not affiliated with Discord.</p>
        <nav className="flex gap-6">
          <Link href="/features" className="hover:text-white">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/faq" className="hover:text-white">
            FAQ
          </Link>
        </nav>
      </div>
    </footer>
  );
}
