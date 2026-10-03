import Link from 'next/link';

import { PlusIcon } from '@/components/icons';
import { MonthSummary } from '@/components/month-summary';
import { PendingServices } from '@/components/pending-services';
import { ProfitByServiceChart } from '@/components/profit-by-service-chart';
import { ProfitTrendChart } from '@/components/profit-trend-chart';
import { getDashboard, getProfitTrend } from '@/lib/queries';

/** Meses que entran en la gráfica de tendencia, incluido el actual. */
const TREND_MONTHS = 6;

export default async function DashboardPage() {
  const [{ cycle, summaries, totals }, trend] = await Promise.all([
    getDashboard(),
    getProfitTrend(TREND_MONTHS),
  ]);

  if (summaries.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-6">
      <MonthSummary cycle={cycle} totals={totals} />

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Por cobrar este mes</h2>

          <Link
            href="/services"
            className="shrink-0 text-sm font-bold text-accent transition-opacity hover:opacity-80">
            Ver todos
          </Link>
        </div>

        <PendingServices summaries={summaries} cycle={cycle} />
      </section>

      <ProfitByServiceChart summaries={summaries} />

      <ProfitTrendChart points={trend} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center">
      <p className="text-lg font-bold">Todavía no hay servicios</p>
      <p className="text-sm text-muted">
        Agrega el primero (por ejemplo, tu Starlink compartido) y aquí verás lo que falta por
        cobrar y cómo van tus ganancias.
      </p>

      <Link
        href="/service/new"
        className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
        <PlusIcon className="size-4" />
        Nuevo servicio
      </Link>
    </div>
  );
}
