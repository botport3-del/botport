import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <div className="font-mono text-sm uppercase tracking-wider text-brand">Error 404</div>
        <h1 className="mt-3 text-4xl font-bold">This page could not be found</h1>
        <p className="mx-auto mt-3 max-w-sm text-slate-400">
          The link may be broken or the page may have moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-primary">
            Back home
          </Link>
          <Link href="/login" className="btn-ghost">
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
