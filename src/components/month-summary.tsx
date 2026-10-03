import { BarLegend, StackedBar } from '@/components/stacked-bar';
import type { BillingCycle } from '@/utils/cycle';
import type { GlobalFinance } from '@/utils/finance';
import { formatCurrency, formatCycle } from '@/utils/format';

/** Encabezado del dashboard: cómo va el mes sumando todos los servicios. */
export function MonthSummary({ cycle, totals }: { cycle: BillingCycle; totals: GlobalFinance }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <div>
        <p className="text-sm text-muted first-letter:uppercase">{formatCycle(cycle)}</p>
        <p className="text-3xl font-semibold">{formatCurrency(totals.collected)}</p>
        <p className="text-sm text-muted">cobrados de {formatCurrency(totals.expectedTotal)}</p>
      </div>

      <div className="flex flex-col gap-2">
        <StackedBar
          collected={totals.collected}
          expectedTotal={totals.expectedTotal}
          expense={totals.totalExpense}
        />
        <BarLegend />
      </div>

      <dl className="flex justify-between gap-2 border-t border-line pt-4">
        <Stat label="Gastos" value={formatCurrency(totals.totalExpense)} />
        <Stat
          label="Ganancia"
          value={formatCurrency(totals.profit)}
          className={totals.profit >= 0 ? 'text-success' : 'text-warning'}
        />
        <Stat label="Por cobrar" value={formatCurrency(totals.remaining)} />
      </dl>
    </section>
  );
}

function Stat({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`text-sm font-bold ${className}`}>{value}</dd>
    </div>
  );
}
