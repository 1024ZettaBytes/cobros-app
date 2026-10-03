import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ClientRow } from '@/components/client-row';
import { FinanceBar } from '@/components/finance-bar';
import { PlusIcon } from '@/components/icons';
import { PageHeader } from '@/components/page-header';
import { getServiceDetail } from '@/lib/queries';
import { getDueDate } from '@/utils/cycle';
import { formatCurrency, formatCycle, formatDueDate } from '@/utils/format';

type Props = { params: Promise<{ id: string }> };

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getServiceDetail(id);
  if (!detail) notFound();

  const { service, clients, finance, cycle } = detail;
  const dueDate = getDueDate(service.billingDay, cycle);

  return (
    <>
      <PageHeader
        title={service.name}
        subtitle={`${formatCurrency(service.clientPrice)} por cliente · corte el ${formatDueDate(dueDate)}`}
        backHref="/services"
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/service/${service.id}/edit`}
              className="rounded-full border border-line px-3 py-1.5 text-sm font-bold transition-colors hover:bg-surface-2">
              Editar
            </Link>

            <Link
              href={`/client/new?serviceId=${service.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
              <PlusIcon className="size-4" />
              Cliente
            </Link>
          </div>
        }
      />

      <section className="mb-4 flex flex-col gap-4 rounded-2xl bg-surface p-4">
        <p className="text-sm text-muted first-letter:uppercase">{formatCycle(cycle)}</p>

        <p className="flex flex-wrap items-baseline gap-2">
          <span className="text-3xl font-bold">{formatCurrency(finance.collected)}</span>
          <span className="text-sm text-muted">de {formatCurrency(finance.expectedTotal)}</span>
        </p>

        <FinanceBar finance={finance} />

        <dl className="flex justify-between gap-2 border-t border-line pt-4">
          <Stat label="Gasto" value={formatCurrency(finance.monthlyExpense)} />
          <Stat
            label="Ganancia"
            value={formatCurrency(finance.profit)}
            className={finance.isBreakEven ? 'text-success' : 'text-warning'}
          />
          <Stat label="Si todos pagan" value={formatCurrency(finance.projectedProfit)} />
        </dl>
      </section>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-8 text-center">
          <p className="text-lg font-bold">Sin clientes todavía</p>
          <p className="text-sm text-muted">
            Usa <span className="font-bold">Cliente</span> arriba para agregar al primero.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {clients.map((summary) => (
            <ClientRow
              key={summary.client.id}
              summary={summary}
              service={service}
              cycle={cycle}
            />
          ))}
        </ul>
      )}
    </>
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
