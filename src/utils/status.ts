import type { PaymentRecord, PaymentStatus, Service } from '@/types';
import { type BillingCycle, getDueDate } from '@/utils/cycle';

/** Días de anticipación con los que un cobro se considera "próximo a vencer". */
const DUE_SOON_DAYS = 3;

export interface ClientStatus {
  status: PaymentStatus;
  /** Fecha de corte del ciclo para este servicio. */
  dueDate: Date;
  /** Días que faltan para el corte. Negativo = ya pasó. */
  daysUntilDue: number;
  /** El pago del ciclo, si ya lo registré. */
  payment: PaymentRecord | null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Diferencia en días completos, ignorando la hora. */
function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

/**
 * El estado nunca se guarda: se deriva de la fecha de hoy, el día de corte del
 * servicio y si existe un pago registrado para el ciclo.
 */
export function computeClientStatus(
  service: Service,
  cycle: BillingCycle,
  payment: PaymentRecord | null,
  today: Date = new Date(),
): ClientStatus {
  const dueDate = getDueDate(service.billingDay, cycle);
  const daysUntilDue = daysBetween(today, dueDate);

  const status: PaymentStatus = payment
    ? 'paid'
    : daysUntilDue < 0
      ? 'overdue'
      : daysUntilDue < DUE_SOON_DAYS
        ? 'due_soon'
        : 'pending';

  return { status, dueDate, daysUntilDue, payment };
}

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  due_soon: 'Próximo a vencer',
  overdue: 'Vencido',
};

/** Orden para la lista: primero lo que requiere acción. */
export const STATUS_PRIORITY: Record<PaymentStatus, number> = {
  overdue: 0,
  due_soon: 1,
  pending: 2,
  paid: 3,
};

/** Texto corto para la fila del cliente, ej. "Vence en 2 días". */
export function describeStatus(status: ClientStatus): string {
  if (status.status === 'paid') return 'Pagado este mes';

  const { daysUntilDue } = status;
  if (daysUntilDue === 0) return 'Vence hoy';
  if (daysUntilDue === 1) return 'Vence mañana';
  if (daysUntilDue > 0) return `Vence en ${daysUntilDue} días`;
  if (daysUntilDue === -1) return 'Venció ayer';
  return `Venció hace ${Math.abs(daysUntilDue)} días`;
}
