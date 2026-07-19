import type { Metadata } from 'next';
import './globals.css';

const title = 'Botport - Discord Backup & Verification';
const description =
  'Back up, protect and recover your Discord server. Automatic backups, one-click restore and transparent member verification - without harvesting member data.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL || 'http://localhost:3000'),
  title: {
    default: title,
    template: '%s / Botport',
  },
  description,
  applicationName: 'Botport',
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: 'Botport',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
};

export const viewport = {
  themeColor: '#0b0d12',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
