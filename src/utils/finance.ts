import type { Client, PaymentRecord, Service } from '@/types';

/**
 * Resumen del mes para un servicio: cuánto debería cobrar, cuánto llevo
 * cobrado, cuánto de eso ya cubrió mi gasto y cuánto es ganancia real.
 */
export interface ServiceFinance {
  activeClients: number;
  paidClients: number;
  /** clientPrice x clientes activos. */
  expectedTotal: number;
  /** Suma de los pagos registrados en el ciclo. */
  collected: number;
  monthlyExpense: number;
  /** Parte de lo cobrado que se va en el gasto. */
  expenseCovered: number;
  /** Lo cobrado menos el gasto. Negativo mientras no llegue al punto de equilibrio. */
  profit: number;
  /** Ganancia si todos pagan. */
  projectedProfit: number;
  /** Falta por cobrar este mes. */
  remaining: number;
  /** 0-1, lo cobrado sobre lo esperado. */
  collectedRatio: number;
  /** 0-1, dónde cae el punto de equilibrio dentro de la barra. */
  breakEvenRatio: number;
  /** Ya cubrí mi gasto este mes. */
  isBreakEven: boolean;
}

function ratio(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(Math.max(part / whole, 0), 1);
}

export function computeServiceFinance(
  service: Service,
  clients: Client[],
  cyclePayments: PaymentRecord[],
): ServiceFinance {
  const activeClients = clients.filter((client) => client.isActive);
  const activeIds = new Set(activeClients.map((client) => client.id));

  // Solo cuentan los pagos de clientes activos de este servicio.
  const relevantPayments = cyclePayments.filter((payment) => activeIds.has(payment.clientId));

  const expectedTotal = service.clientPrice * activeClients.length;
  const collected = relevantPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
  const expenseCovered = Math.min(collected, service.monthlyExpense);

  return {
    activeClients: activeClients.length,
    paidClients: relevantPayments.length,
    expectedTotal,
    collected,
    monthlyExpense: service.monthlyExpense,
    expenseCovered,
    profit: collected - service.monthlyExpense,
    projectedProfit: expectedTotal - service.monthlyExpense,
    remaining: Math.max(expectedTotal - collected, 0),
    collectedRatio: ratio(collected, expectedTotal),
    breakEvenRatio: ratio(service.monthlyExpense, expectedTotal),
    isBreakEven: collected >= service.monthlyExpense,
  };
}

export interface GlobalFinance {
  collected: number;
  expectedTotal: number;
  totalExpense: number;
  profit: number;
  projectedProfit: number;
  remaining: number;
}

/** Totales de todos los servicios juntos, para el encabezado del dashboard. */
export function computeGlobalFinance(summaries: ServiceFinance[]): GlobalFinance {
  return summaries.reduce<GlobalFinance>(
    (totals, item) => ({
      collected: totals.collected + item.collected,
      expectedTotal: totals.expectedTotal + item.expectedTotal,
      totalExpense: totals.totalExpense + item.monthlyExpense,
      profit: totals.profit + item.profit,
      projectedProfit: totals.projectedProfit + item.projectedProfit,
      remaining: totals.remaining + item.remaining,
    }),
    { collected: 0, expectedTotal: 0, totalExpense: 0, profit: 0, projectedProfit: 0, remaining: 0 },
  );
}
