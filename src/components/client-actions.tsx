'use client';

import { useRouter } from 'next/navigation';

import { clientsApi, paymentsApi } from '@/api';
import { WhatsAppIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { useAction } from '@/hooks/use-action';
import { useReminder } from '@/hooks/use-reminder';
import type { Client, Service } from '@/types';
import type { BillingCycle } from '@/utils/cycle';
import { formatCurrency, formatCycle, parseAmount } from '@/utils/format';
import type { ClientStatus } from '@/utils/status';

export function ClientActions({
  client,
  service,
  status,
  cycle,
}: {
  client: Client;
  service: Service;
  status: ClientStatus;
  cycle: BillingCycle;
}) {
  const router = useRouter();
  const dialog = useDialog();
  const { run, pending } = useAction();
  const { sendReminder } = useReminder();

  const isPaid = status.status === 'paid';

  async function promptCustomAmount() {
    const typed = await dialog.prompt({
      title: 'Registrar otro monto',
      message: `¿Cuánto pagó para ${formatCycle(cycle)}?`,
      label: 'Monto',
      prefix: '$',
      defaultValue: String(service.clientPrice),
      inputMode: 'decimal',
      confirmLabel: 'Registrar',
    });

    if (typed === null) return;

    const amount = parseAmount(typed);
    if (!Number.isFinite(amount) || amount <= 0) {
      await dialog.alert('Monto inválido', 'Escribe una cantidad mayor a 0.');
      return;
    }

    await run(() =>
      paymentsApi.registerPayment({ clientId: client.id, amountPaid: amount, cycle }),
    );
  }

  async function confirmUndo() {
    const confirmed = await dialog.confirm({
      title: 'Deshacer el pago de este mes',
      message: `Se borrará el pago de ${formatCycle(cycle)}.`,
      confirmLabel: 'Deshacer',
      destructive: true,
    });

    if (confirmed) await run(() => paymentsApi.removeForCycle(client.id, cycle));
  }

  async function confirmDelete() {
    const confirmed = await dialog.confirm({
      title: `¿Eliminar a ${client.name}?`,
      message: 'También se borrará todo su historial de pagos. Esto no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (!confirmed) return;

    await run(async () => {
      await clientsApi.remove(client.id);
      router.push(`/service/${service.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {isPaid ? (
        <Button variant="secondary" onClick={() => void confirmUndo()} disabled={pending}>
          Deshacer pago del mes
        </Button>
      ) : (
        <Button
          onClick={() =>
            void run(() =>
              paymentsApi.registerPayment({
                clientId: client.id,
                amountPaid: service.clientPrice,
                cycle,
              }),
            )
          }
          disabled={pending || !client.isActive}>
          Registrar pago de {formatCurrency(service.clientPrice)}
        </Button>
      )}

      <Button
        variant="secondary"
        onClick={() => void sendReminder(client, service, status.dueDate)}>
        <WhatsAppIcon />
        Mandar recordatorio
      </Button>

      <Button variant="secondary" onClick={() => void promptCustomAmount()} disabled={pending}>
        Registrar otro monto
      </Button>

      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => void run(() => clientsApi.setActive(client.id, !client.isActive))}>
        {client.isActive ? 'Marcar como inactivo' : 'Reactivar cliente'}
      </Button>

      <Button variant="danger" onClick={() => void confirmDelete()} disabled={pending}>
        Eliminar cliente
      </Button>
    </div>
  );
}
