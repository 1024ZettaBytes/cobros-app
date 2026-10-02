import type { BillingCycle } from '@/utils/cycle';
import type { GlobalFinance } from '@/utils/finance';
import { formatCurrency, formatCycle } from '@/utils/format';

/** Encabezado del dashboard: cómo va el mes sumando todos los servicios. */
export function MonthSummary({ cycle, totals }: { cycle: BillingCycle; totals: GlobalFinance }) {
  return (
    <section className="rounded-2xl bg-surface p-4">
      <p className="text-sm text-muted capitalize">{formatCycle(cycle)}</p>

      <p className="text-3xl font-semibold">{formatCurrency(totals.collected)}</p>
      <p className="text-sm text-muted">cobrados de {formatCurrency(totals.expectedTotal)}</p>

      <dl className="mt-4 flex justify-between gap-2 border-t border-line pt-4">
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
