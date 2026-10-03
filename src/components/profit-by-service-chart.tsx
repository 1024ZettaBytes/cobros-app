import Link from 'next/link';

import type { ServiceSummary } from '@/lib/queries';
import { formatCurrency } from '@/utils/format';

/** Ancho mínimo de una barra distinta de cero, para que no desaparezca. */
const MIN_VISIBLE = 1.5;

/**
 * Ganancia de cada servicio este mes, en una escala compartida para poder
 * compararlos: hacia la derecha del cero si ya cubrió su gasto, hacia la
 * izquierda si todavía no.
 *
 * Solo se dibuja la ganancia real. Llegué a pintar también un tramo claro con
 * la ganancia "si todos pagan", pero cuando la barra sólida caía a la
 * izquierda del cero y la clara a la derecha, las dos se tocaban y parecían
 * una sola barra de dos colores que se sumaban. Ese dato vive en el texto de
 * abajo, donde no se presta a confusión.
 */
export function ProfitByServiceChart({ summaries }: { summaries: ServiceSummary[] }) {
  const rows = summaries
    .filter((summary) => summary.finance.activeClients > 0)
    .sort((a, b) => b.finance.profit - a.finance.profit);

  if (rows.length === 0) return null;

  const scale = Math.max(...rows.map((row) => Math.abs(row.finance.profit)), 1);

  // Si nada está en números rojos, el cero se pega a la izquierda y las barras
  // aprovechan el ancho completo.
  const hasLoss = rows.some((row) => row.finance.profit < 0);
  const origin = hasLoss ? 50 : 0;
  const span = hasLoss ? 50 : 100;

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <h2 className="text-lg font-bold">Ganancia por servicio</h2>

      <ul className="flex flex-col gap-4">
        {rows.map(({ service, finance }) => {
          const end = origin + Math.min(Math.max(finance.profit / scale, -1), 1) * span;
          const width = Math.abs(end - origin);

          return (
            <li key={service.id} className="relative flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/service/${service.id}`}
                  className="truncate font-semibold outline-none after:absolute after:inset-0">
                  {service.name}
                </Link>
                <span
                  className={`shrink-0 text-sm font-bold ${finance.isBreakEven ? 'text-success' : 'text-warning'}`}>
                  {formatCurrency(finance.profit)}
                </span>
              </div>

              {/* La holgura vertical es para que el eje sobresalga de la pista
                  y se lea como eje y no como un pedazo más de la barra. */}
              <div className="relative py-1">
                <div
                  role="img"
                  aria-label={`Ganancia ${formatCurrency(finance.profit)}; ${formatCurrency(finance.projectedProfit)} si todos pagan.`}
                  className="relative h-4 w-full overflow-hidden rounded-full bg-track">
                  <div
                    className={`absolute inset-y-0 rounded-full ${finance.isBreakEven ? 'bg-success' : 'bg-warning'}`}
                    style={{
                      left: `${Math.min(origin, end)}%`,
                      width: `${Math.max(width, finance.profit === 0 ? 0 : MIN_VISIBLE)}%`,
                    }}
                  />
                </div>

                {hasLoss && (
                  <div
                    aria-hidden
                    className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-fg/70"
                    style={{ left: `${origin}%` }}
                  />
                )}
              </div>

              <p className="text-sm text-muted">
                {finance.isBreakEven
                  ? `hasta ${formatCurrency(finance.projectedProfit)} si todos pagan`
                  : `faltan ${formatCurrency(-finance.profit)} para cubrir el gasto`}
              </p>
            </li>
          );
        })}
      </ul>

      {hasLoss && <p className="text-sm text-muted">La línea vertical es el cero.</p>}
    </section>
  );
}
