import type { Metadata, Viewport } from 'next';

import { DialogProvider } from '@/components/ui/dialog';

import './globals.css';

export const metadata: Metadata = {
  title: 'Mis cobros',
  description: 'Administra los cobros mensuales de tus clientes.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Mis cobros',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
