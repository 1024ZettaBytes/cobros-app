import Link from 'next/link';

import { PlusIcon } from '@/components/icons';
import { PageHeader } from '@/components/page-header';
import { ServiceCard } from '@/components/service-card';
import { getDashboard } from '@/lib/queries';
import { formatCycle } from '@/utils/format';

export default async function ServicesPage() {
  const { cycle, summaries } = await getDashboard();

  return (
    <>
      <PageHeader
        title="Servicios"
        subtitle={<span className="first-letter:uppercase">{formatCycle(cycle)}</span>}
        backHref="/"
        action={
          <Link
            href="/service/new"
            className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
            <PlusIcon className="size-4" />
            Nuevo
          </Link>
        }
      />

      {summaries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-8 text-center">
          <p className="text-lg font-bold">Todavía no hay servicios</p>
          <p className="text-sm text-muted">
            Agrega el primero (por ejemplo, tu Starlink compartido) con el botón{' '}
            <span className="font-bold">Nuevo</span>.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {summaries.map((summary) => (
            <li key={summary.service.id}>
              <ServiceCard summary={summary} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
