import Link from 'next/link';

export function ServerCard({
  href,
  name,
  iconUrl,
  subtitle,
  action,
}: {
  href?: string;
  name: string;
  iconUrl: string | null;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const inner = (
    <>
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt="" className="h-10 w-10 rounded-full" />
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/30 font-semibold">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{name}</div>
        {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
      </div>
      {action}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card flex items-center gap-3 hover:border-brand/60">
        {inner}
      </Link>
    );
  }
  return <div className="card flex items-center gap-3">{inner}</div>;
}
