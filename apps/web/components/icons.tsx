import type { SVGProps } from 'react';

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

export function ArchiveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7 3v5c0 4.4-3 7.5-7 9-4-1.5-7-4.6-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function GateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9l1.5-4h13L20 9" />
      <path d="M5 9v11M19 9v11M9.5 9v11M14.5 9v11M4 9h16" />
    </svg>
  );
}

export function TeamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3 2.8-4.8 5.5-4.8s5.5 1.8 5.5 4.8" />
      <path d="M16 6a3 3 0 0 1 0 6" />
      <path d="M21 20c0-1.8-1-3.3-2.7-4" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} strokeWidth={2.2} {...props}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
