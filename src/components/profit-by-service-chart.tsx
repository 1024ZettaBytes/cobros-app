import Link from 'next/link';

import type { ServiceSummary } from '@/lib/queries';
import { formatCurrency } from '@/utils/format';

/** Ancho mínimo de una barra distinta de cero, para que no desaparezca. */
const MIN_VISIBLE = 1.5;

/**
 * Ganancia de cada servicio este mes, en una escala compartida para poder
 * compararlos. Las barras salen del cero hacia la derecha si el servicio ya
 * cubrió su gasto y hacia la izquierda si todavía no.
 *
 * La línea vertical de cada fila marca la ganancia si cobrara a todos sus
 * clientes: es el mismo lenguaje que el marcador de punto de equilibrio en la
 * barra de cobro, un "hasta aquí puedes llegar".
 */
export function ProfitByServiceChart({ summaries }: { summaries: ServiceSummary[] }) {
  const rows = summaries
    .filter((summary) => summary.finance.activeClients > 0)
    .sort((a, b) => b.finance.projectedProfit - a.finance.projectedProfit);

  if (rows.length === 0) return null;

  const values = rows.flatMap(({ finance }) => [finance.profit, finance.projectedProfit]);
  const scale = Math.max(...values.map(Math.abs), 1);

  // Si nada está en números rojos, el cero se pega a la izquierda y las barras
  // aprovechan el ancho completo.
  const hasLoss = values.some((value) => value < 0);
  const origin = hasLoss ? 50 : 0;
  const span = hasLoss ? 50 : 100;

  /** Posición en % de un monto dentro de la barra. */
  const at = (value: number) =>
    origin + Math.min(Math.max(value / scale, -1), 1) * span;

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <h2 className="text-lg font-bold">Ganancia por servicio</h2>

      <ul className="flex flex-col gap-4">
        {rows.map(({ service, finance }) => {
          const end = at(finance.profit);
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

              <div
                role="img"
                aria-label={`Ganancia ${formatCurrency(finance.profit)}; ${formatCurrency(finance.projectedProfit)} si todos pagan.`}
                className="relative h-2.5 w-full overflow-hidden rounded-full bg-track">
                {hasLoss && (
                  <div aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-line" />
                )}

                <div
                  className={`absolute inset-y-0 rounded-full ${finance.isBreakEven ? 'bg-success' : 'bg-warning'}`}
                  style={{
                    left: `${Math.min(origin, end)}%`,
                    width: `${Math.max(width, finance.profit === 0 ? 0 : MIN_VISIBLE)}%`,
                  }}
                />

                {/* El servicio que marca la escala cae justo en el 100%, y
                    ahí el marcador quedaría fuera del recorte. */}
                <div
                  aria-hidden
                  className="absolute inset-y-0 w-0.5 bg-fg/45"
                  style={{ left: `min(${at(finance.projectedProfit)}%, calc(100% - 2px))` }}
                />
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

      <p className="text-sm text-muted">La línea marca la ganancia si cobras a todos.</p>
    </section>
  );
}
