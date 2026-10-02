import type { PaymentStatus } from '@/types';
import { STATUS_LABELS } from '@/utils/status';

const STATUS_CLASSES: Record<PaymentStatus, string> = {
  paid: 'border-success text-success',
  pending: 'border-line text-muted',
  due_soon: 'border-warning text-warning',
  overdue: 'border-danger text-danger',
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-sm font-semibold whitespace-nowrap ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Variante apagada para clientes dados de baja. */
export function InactiveBadge() {
  return (
    <span className="rounded-full border border-line px-2 py-0.5 text-sm font-semibold text-muted">
      Inactivo
    </span>
  );
}
