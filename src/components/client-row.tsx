'use client';

import Link from 'next/link';

import { paymentsApi } from '@/api';
import { InactiveBadge, StatusBadge } from '@/components/status-badge';
import { useDialog } from '@/components/ui/dialog';
import { useAction } from '@/hooks/use-action';
import { useReminder } from '@/hooks/use-reminder';
import type { ClientSummary } from '@/lib/queries';
import type { Service } from '@/types';
import type { BillingCycle } from '@/utils/cycle';
import { formatCurrency, formatCycle } from '@/utils/format';
import { describeStatus } from '@/utils/status';

export function ClientRow({
  summary,
  service,
  cycle,
}: {
  summary: ClientSummary;
  service: Service;
  cycle: BillingCycle;
}) {
  const { client, status } = summary;
  const dialog = useDialog();
  const { run, pending } = useAction();
  const { sendReminder } = useReminder();

  const showActions = client.isActive && status.status !== 'paid';

  async function handleCollect() {
    const confirmed = await dialog.confirm({
      title: `Registrar pago de ${client.name}`,
      message: `Se registrará ${formatCurrency(service.clientPrice)} para ${formatCycle(cycle)}.`,
      confirmLabel: 'Registrar',
    });

    if (confirmed) {
      await run(() =>
        paymentsApi.registerPayment({
          clientId: client.id,
          amountPaid: service.clientPrice,
          cycle,
        }),
      );
    }
  }

  return (
    <li className="relative flex items-center justify-between gap-4 rounded-xl bg-surface p-4 transition-colors hover:bg-surface-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
      <div className="min-w-0">
        <Link
          href={`/client/${client.id}`}
          className="font-semibold outline-none after:absolute after:inset-0">
          {client.name}
        </Link>
        <p className="truncate text-sm text-muted">
          {client.isActive
            ? status.status === 'paid' && status.payment
              ? `Pagó ${formatCurrency(status.payment.amountPaid)}`
              : describeStatus(status)
            : 'No genera cobros'}
        </p>
      </div>

      <div className="relative z-10 flex shrink-0 flex-col items-end gap-2">
        {client.isActive ? <StatusBadge status={status.status} /> : <InactiveBadge />}

        {showActions && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void sendReminder(client, service, status.dueDate)}
              className="rounded-full border border-line px-3 py-1 text-sm font-bold transition-colors hover:bg-surface-2">
              Recordar
            </button>
            <button
              type="button"
              onClick={handleCollect}
              disabled={pending}
              className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
              Cobrar
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
