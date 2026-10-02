import Link from 'next/link';

import { MonthSummary } from '@/components/month-summary';
import { ServiceCard } from '@/components/service-card';
import { PlusIcon } from '@/components/icons';
import { getDashboard } from '@/lib/queries';

export default async function DashboardPage() {
  const { cycle, summaries, totals } = await getDashboard();

  return (
    <div className="flex flex-col gap-4">
      <MonthSummary cycle={cycle} totals={totals} />

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Servicios</h2>

        <Link
          href="/service/new"
          className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
          <PlusIcon className="size-4" />
          Nuevo
        </Link>
      </div>

      {summaries.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-4">
          {summaries.map((summary) => (
            <li key={summary.service.id}>
              <ServiceCard summary={summary} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-8 text-center">
      <p className="text-lg font-bold">Todavía no hay servicios</p>
      <p className="text-sm text-muted">
        Agrega el primero (por ejemplo, tu Starlink compartido) con el botón{' '}
        <span className="font-bold">Nuevo</span>.
      </p>
    </div>
  );
}
