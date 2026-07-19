import type { Metadata } from 'next';
import './globals.css';

const title = 'Devorju - Discord Backup & Verification';
const description =
  'Back up, protect and recover your Discord server. Automatic backups, one-click restore and transparent member verification - without harvesting member data.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL || 'http://localhost:3000'),
  title: {
    default: title,
    template: '%s / Devorju',
  },
  description,
  applicationName: 'Devorju',
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: 'Devorju',
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
