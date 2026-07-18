import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Botport — Discord Backup & Verification',
  description:
    'Back up, protect and recover your Discord server. Transparent verification and one-click restore.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
