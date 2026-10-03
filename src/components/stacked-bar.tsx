import { formatCurrency } from '@/utils/format';

/**
 * Barra de cobro del mes: el tramo azul es lo que va a pagar el gasto base,
 * el verde es ganancia y la línea marca el punto de equilibrio.
 *
 * La comparten la tarjeta de un servicio y el resumen global del dashboard.
 * Son dos formas distintas (ServiceFinance y GlobalFinance) con la misma
 * lectura, así que la barra solo pide los tres números que necesita.
 */
export function StackedBar({
  collected,
  expectedTotal,
  expense,
  className = 'h-3.5',
}: {
  collected: number;
  expectedTotal: number;
  expense: number;
  className?: string;
}) {
  const ratio = (part: number) =>
    expectedTotal > 0 ? Math.min(Math.max(part / expectedTotal, 0), 1) : 0;

  const expenseRatio = ratio(Math.min(collected, expense));
  const profitRatio = Math.max(ratio(collected) - expenseRatio, 0);
  const breakEvenRatio = ratio(expense);

  const showMarker = expectedTotal > 0 && breakEvenRatio > 0 && breakEvenRatio < 1;

  return (
    <div
      role="img"
      aria-label={`Cobrado ${formatCurrency(collected)} de ${formatCurrency(expectedTotal)}. Gasto ${formatCurrency(expense)}.`}
      className={`relative flex overflow-hidden rounded-full bg-track ${className}`}>
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
          style={{ left: `${breakEvenRatio * 100}%` }}
        />
      )}
    </div>
  );
}

/** Leyenda de los colores de StackedBar. */
export function BarLegend() {
  return (
    <div className="flex gap-4 text-sm text-muted">
      <LegendDot className="bg-accent" label="Gasto base" />
      <LegendDot className="bg-success" label="Ganancia" />
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
