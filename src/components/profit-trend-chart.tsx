import type { MonthlyPoint } from '@/lib/queries';
import { formatCurrency, formatMonthShort } from '@/utils/format';

/** Alto mínimo de una barra distinta de cero, para que no desaparezca. */
const MIN_VISIBLE = 3;

/**
 * Ganancia mes a mes. Las barras crecen desde una línea de cero; si algún mes
 * cerró en pérdida, el cero se va al centro y esos meses cuelgan hacia abajo.
 */
export function ProfitTrendChart({ points }: { points: MonthlyPoint[] }) {
  const scale = Math.max(...points.map((point) => Math.abs(point.profit)), 1);
  const hasLoss = points.some((point) => point.profit < 0);

  const height = (profit: number) =>
    `${Math.max((Math.abs(profit) / scale) * 100, MIN_VISIBLE)}%`;

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <h2 className="text-lg font-bold">Ganancia por mes</h2>

      {/* El área de dibujo mide siempre h-32 y arranca pegada al borde de la
          columna, así que la línea de cero va a una distancia fija del
          contenedor; si colgara de la lista, las etiquetas la descuadrarían. */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-x-0 border-t border-line"
          style={{ top: hasLoss ? '4rem' : '8rem' }}
        />

        <ul className="flex gap-2">
          {points.map((point, index) => {
            const label = formatMonthShort(point.cycle);
            const isCurrent = index === points.length - 1;

            return (
              <li
                key={`${point.cycle.year}-${point.cycle.month}`}
                title={`${label}: ganancia ${formatCurrency(point.profit)} — cobrado ${formatCurrency(point.collected)}, gasto ${formatCurrency(point.expense)}`}
                className="flex flex-1 flex-col">
                <div className="flex h-32 flex-col">
                  <div className={`flex items-end ${hasLoss ? 'h-1/2' : 'h-full'}`}>
                    {point.profit > 0 && (
                      <div
                        className="w-full rounded-t-sm bg-success"
                        style={{ height: height(point.profit) }}
                      />
                    )}
                  </div>

                  {hasLoss && (
                    <div className="flex h-1/2 items-start">
                      {point.profit < 0 && (
                        <div
                          className="w-full rounded-b-sm bg-warning"
                          style={{ height: height(point.profit) }}
                        />
                      )}
                    </div>
                  )}
                </div>

                <span
                  className={`mt-2 text-center text-sm capitalize ${isCurrent ? 'font-bold' : 'text-muted'}`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-sm text-muted">
        Cobrado menos gasto de cada mes. El mes en curso todavía está sumando.
      </p>
    </section>
  );
}
