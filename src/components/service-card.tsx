import Link from 'next/link';

import { DeleteServiceButton } from '@/components/delete-service-button';
import { FinanceBar } from '@/components/finance-bar';
import type { ServiceSummary } from '@/lib/queries';
import { formatCurrency } from '@/utils/format';

export function ServiceCard({ summary }: { summary: ServiceSummary }) {
  const { service, finance } = summary;
  const hasClients = finance.activeClients > 0;

  return (
    <article className="relative flex flex-col gap-4 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
      <header className="flex items-start justify-between gap-2">
        {/* El ::after cubre la tarjeta completa: así todo es clicable sin
            anidar botones dentro de un enlace, que sería HTML inválido. */}
        <Link
          href={`/service/${service.id}`}
          className="text-lg font-bold outline-none after:absolute after:inset-0">
          {service.name}
        </Link>

        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-sm text-muted whitespace-nowrap">
            Corte día {service.billingDay}
          </span>
          <DeleteServiceButton
            serviceId={service.id}
            serviceName={service.name}
            clientCount={summary.clients.length}
          />
        </div>
      </header>

      {hasClients ? (
        <>
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-bold">{formatCurrency(finance.collected)}</span>
            <span className="text-sm text-muted">
              de {formatCurrency(finance.expectedTotal)} esperados
            </span>
          </p>

          <FinanceBar finance={finance} />

          <footer className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted">
              {finance.paidClients} de {finance.activeClients}{' '}
              {finance.activeClients === 1 ? 'cliente pagó' : 'clientes pagaron'}
            </span>

            {finance.isBreakEven ? (
              <span className="font-bold text-success">
                Ganancia {formatCurrency(finance.profit)}
              </span>
            ) : (
              <span className="font-bold text-warning">
                Faltan {formatCurrency(-finance.profit)} para el gasto
              </span>
            )}
          </footer>
        </>
      ) : (
        <p className="text-sm text-muted">
          Sin clientes activos. Gasto mensual {formatCurrency(finance.monthlyExpense)}.
        </p>
      )}
    </article>
  );
}
