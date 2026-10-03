import type { MonthlyPoint } from '@/lib/queries';
import { formatCurrency, formatMonthShort } from '@/utils/format';

/** Alto del área de dibujo. Se repite como número para colocar el eje. */
const PLOT_REM = 8;

/** Alto mínimo de una barra distinta de cero, para que no desaparezca. */
const MIN_VISIBLE = 3;

/**
 * Ganancia mes a mes, con el cero donde lo pida la serie: si ningún mes cerró
 * en pérdida se va hasta abajo, si ninguno dio ganancia se va hasta arriba, y
 * si hay de las dos se reparte en proporción. Partirlo siempre a la mitad
 * dejaba media gráfica vacía.
 */
export function ProfitTrendChart({ points }: { points: MonthlyPoint[] }) {
  const profits = points.map((point) => point.profit);
  const maxGain = Math.max(...profits, 0);
  const maxLoss = Math.max(...profits.map((profit) => -profit), 0);
  const range = maxGain + maxLoss;

  /** Parte del alto que le toca a la zona de ganancias. */
  const gainShare = range > 0 ? maxGain / range : 1;

  const height = (value: number, max: number) =>
    `${Math.max((value / max) * 100, MIN_VISIBLE)}%`;

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <h2 className="text-lg font-bold">Ganancia por mes</h2>

      {/* El área de dibujo mide siempre PLOT_REM y arranca pegada al borde de
          la columna, así que el eje se coloca a una distancia fija del
          contenedor; si colgara de la lista, las etiquetas lo descuadrarían. */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-x-0 border-t border-fg/20"
          style={{ top: `${gainShare * PLOT_REM}rem` }}
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
                <div className="flex flex-col" style={{ height: `${PLOT_REM}rem` }}>
                  <div
                    className="flex items-end justify-center"
                    style={{ height: `${gainShare * 100}%` }}>
                    {point.profit > 0 && (
                      <div
                        className="w-full max-w-12 rounded-t-sm bg-success"
                        style={{ height: height(point.profit, maxGain) }}
                      />
                    )}
                  </div>

                  <div
                    className="flex items-start justify-center"
                    style={{ height: `${(1 - gainShare) * 100}%` }}>
                    {point.profit < 0 && (
                      <div
                        className="w-full max-w-12 rounded-b-sm bg-warning"
                        style={{ height: height(-point.profit, maxLoss) }}
                      />
                    )}
                  </div>
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
