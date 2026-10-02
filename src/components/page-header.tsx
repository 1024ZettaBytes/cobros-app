import Link from 'next/link';
import type { ReactNode } from 'react';

import { BackIcon } from '@/components/icons';

/** Encabezado de las pantallas internas: volver + título + acción opcional. */
export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  backHref: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <Link
          href={backHref}
          aria-label="Volver"
          className="-ml-2 rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-fg">
          <BackIcon />
        </Link>

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
