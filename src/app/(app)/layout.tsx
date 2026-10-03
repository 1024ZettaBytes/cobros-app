import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { GearIcon } from '@/components/icons';
import { hasValidSession } from '@/lib/auth';

/**
 * Todo lo que cuelga de aquí exige sesión. Al ser server component, la
 * verificación ocurre antes de mandar un solo byte de la página.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await hasValidSession())) redirect('/login');

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-lg font-bold">
            Mis cobros
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/services"
              className="rounded-lg px-3 py-2 text-sm font-bold text-muted transition-colors hover:bg-surface hover:text-fg">
              Servicios
            </Link>

            <Link
              href="/settings"
              aria-label="Ajustes"
              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-fg">
              <GearIcon />
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl p-4">{children}</main>
    </div>
  );
}
