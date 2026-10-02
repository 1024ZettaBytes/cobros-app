import { notFound } from 'next/navigation';

import { ClientActions } from '@/components/client-actions';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { getClientDetail } from '@/lib/queries';
import { formatCurrency, formatCycle, formatDueDate, formatShortDate } from '@/utils/format';
import { describeStatus } from '@/utils/status';

type Props = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();

  const { client, service, status, history, cycle } = detail;

  return (
    <>
      <PageHeader
        title={client.name}
        subtitle={`${service.name} · +52 ${client.phoneNumber}`}
        backHref={`/service/${service.id}`}
      />

      <section className="mb-6 flex flex-col gap-1 rounded-2xl bg-surface p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-sm text-muted capitalize">{formatCycle(cycle)}</p>
          {client.isActive ? (
            <StatusBadge status={status.status} />
          ) : (
            <span className="text-sm text-muted">Inactivo</span>
          )}
        </div>

        <p className="text-4xl font-bold">{formatCurrency(service.clientPrice)}</p>
        <p className="text-sm text-muted">corte el {formatDueDate(status.dueDate)}</p>
        <p className="text-sm text-muted">
          {client.isActive ? describeStatus(status) : 'No genera cobros mientras esté inactivo'}
        </p>
      </section>

      <ClientActions client={client} service={service} status={status} cycle={cycle} />

      <section className="mt-6 flex flex-col gap-2">
        <h2 className="text-sm font-bold">Historial de pagos</h2>

        {history.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay pagos registrados.</p>
        ) : (
          <ul className="rounded-xl bg-surface px-4">
            {history.map((payment, index) => (
              <li
                key={payment.id}
                className={`flex items-center justify-between gap-2 py-4 ${
                  index < history.length - 1 ? 'border-b border-line' : ''
                }`}>
                <div>
                  <p className="text-sm font-bold capitalize">
                    {formatCycle({ month: payment.cycleMonth, year: payment.cycleYear })}
                  </p>
                  <p className="text-sm text-muted">
                    Registrado el {formatShortDate(payment.datePaid)}
                  </p>
                </div>
                <p className="text-sm font-bold">{formatCurrency(payment.amountPaid)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
