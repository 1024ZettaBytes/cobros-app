import Link from 'next/link';

import { StatusBadge } from '@/components/status-badge';
import type { ServiceSummary } from '@/lib/queries';
import type { BillingCycle } from '@/utils/cycle';
import { formatCurrency } from '@/utils/format';
import { computeClientStatus, describeStatus, STATUS_PRIORITY } from '@/utils/status';

/**
 * Lo que falta por cobrar este mes, servicio por servicio.
 *
 * El estado del servicio se calcula con la misma función que el de un cliente,
 * pasándole un pago nulo: un servicio con cobros pendientes está exactamente
 * igual de vencido que lo estaría un cliente suyo que no ha pagado.
 */
export function PendingServices({
  summaries,
  cycle,
}: {
  summaries: ServiceSummary[];
  cycle: BillingCycle;
}) {
  const pending = summaries
    .filter((summary) => summary.finance.activeClients > 0 && summary.finance.remaining > 0)
    .map((summary) => ({ ...summary, status: computeClientStatus(summary.service, cycle, null) }))
    .sort((a, b) => {
      const byUrgency = STATUS_PRIORITY[a.status.status] - STATUS_PRIORITY[b.status.status];
      return byUrgency !== 0 ? byUrgency : b.finance.remaining - a.finance.remaining;
    });

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center">
        <p className="text-lg font-bold text-success">Todo cobrado</p>
        <p className="text-sm text-muted">No queda nada pendiente este mes.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {pending.map(({ service, finance, status }) => {
        const missing = finance.activeClients - finance.paidClients;

        return (
          <li
            key={service.id}
            className="relative flex items-center justify-between gap-4 rounded-xl bg-surface p-4 transition-colors hover:bg-surface-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
            <div className="min-w-0">
              <Link
                href={`/service/${service.id}`}
                className="font-semibold outline-none after:absolute after:inset-0">
                {service.name}
              </Link>
              <p className="truncate text-sm text-muted">
                {missing} de {finance.activeClients}{' '}
                {missing === 1 ? 'cliente debe' : 'clientes deben'} · {describeStatus(status)}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-bold">{formatCurrency(finance.remaining)}</span>
              <StatusBadge status={status.status} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
