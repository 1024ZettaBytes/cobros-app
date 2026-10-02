import type { ServiceFinance } from '@/utils/finance';
import { formatCurrency } from '@/utils/format';

/**
 * Barra de cobro del mes. El tramo azul es lo que va a pagar el gasto base y
 * el verde es ganancia; la línea marca el punto de equilibrio.
 */
export function FinanceBar({ finance }: { finance: ServiceFinance }) {
  const total = finance.expectedTotal;
  const expenseRatio = total > 0 ? Math.min(finance.expenseCovered / total, 1) : 0;
  const profitRatio = Math.max(finance.collectedRatio - expenseRatio, 0);

  const showMarker = total > 0 && finance.breakEvenRatio > 0 && finance.breakEvenRatio < 1;

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`Cobrado ${formatCurrency(finance.collected)} de ${formatCurrency(total)}. Gasto ${formatCurrency(finance.monthlyExpense)}.`}
        className="relative flex h-3.5 overflow-hidden rounded-full bg-track">
        {expenseRatio > 0 && (
          <div className="h-full bg-accent" style={{ width: `${expenseRatio * 100}%` }} />
        )}
        {profitRatio > 0 && (
          <div className="h-full bg-success" style={{ width: `${profitRatio * 100}%` }} />
        )}

        {showMarker && (
          <div
            aria-hidden
            className="absolute inset-y-0 w-0.5 bg-fg/45"
            style={{ left: `${finance.breakEvenRatio * 100}%` }}
          />
        )}
      </div>

      <div className="flex gap-4 text-sm text-muted">
        <LegendDot className="bg-accent" label="Gasto base" />
        <LegendDot className="bg-success" label="Ganancia" />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span aria-hidden className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}
