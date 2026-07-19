import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-border/60 bg-surface/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-indigo-500 text-white shadow-lg shadow-brand/30">
            D
          </span>
          Devorju
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="/features" className="hover:text-white">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/tools" className="hover:text-white">
            Tools
          </Link>
          <Link href="/faq" className="hover:text-white">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm text-slate-300 hover:text-white sm:block">
            Log in
          </Link>
          <Link href="/login" className="btn-primary">
            Open dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
