import { api } from '@/api/client';
import type { PaymentRecord } from '@/types';
import { type BillingCycle, getCycleForDate } from '@/utils/cycle';

export const paymentsApi = {
  /**
   * Registra o corrige el pago de un ciclo. El servidor hace upsert sobre
   * unique (client_id, cycle_month, cycle_year), así que no hay forma de
   * duplicar aunque se disparen dos peticiones a la vez.
   */
  registerPayment(input: {
    clientId: string;
    amountPaid: number;
    cycle?: BillingCycle;
    datePaid?: Date;
    note?: string;
  }): Promise<PaymentRecord> {
    const datePaid = input.datePaid ?? new Date();
    const cycle = input.cycle ?? getCycleForDate(datePaid);

    return api.post<PaymentRecord>('/api/payments', {
      clientId: input.clientId,
      amountPaid: input.amountPaid,
      cycleMonth: cycle.month,
      cycleYear: cycle.year,
      datePaid: datePaid.toISOString(),
      note: input.note,
    });
  },

  /** Deshace el pago de un ciclo sin necesitar su id. */
  removeForCycle: (clientId: string, cycle: BillingCycle) =>
    api.delete(
      `/api/payments?clientId=${encodeURIComponent(clientId)}&cycleMonth=${cycle.month}&cycleYear=${cycle.year}`,
    ),
};
