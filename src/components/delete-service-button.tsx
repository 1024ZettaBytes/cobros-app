'use client';

import { servicesApi } from '@/api';
import { TrashIcon } from '@/components/icons';
import { useDialog } from '@/components/ui/dialog';
import { useAction } from '@/hooks/use-action';

export function DeleteServiceButton({
  serviceId,
  serviceName,
  clientCount,
}: {
  serviceId: string;
  serviceName: string;
  clientCount: number;
}) {
  const dialog = useDialog();
  const { run, pending } = useAction();

  async function handleClick() {
    const confirmed = await dialog.confirm({
      title: `¿Eliminar ${serviceName}?`,
      message:
        clientCount > 0
          ? `También se borrarán ${clientCount} ${clientCount === 1 ? 'cliente' : 'clientes'} y todo su historial de pagos. Esto no se puede deshacer.`
          : 'Esto no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (confirmed) await run(() => servicesApi.remove(serviceId));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={`Eliminar ${serviceName}`}
      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-danger disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <TrashIcon />
    </button>
  );
}
