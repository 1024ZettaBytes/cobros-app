import 'server-only';

import type { PoolClient } from 'pg';

import type { BillingCycle } from '@/utils/cycle';

/**
 * Anota el gasto que rige para un servicio a partir de un ciclo.
 *
 * Es un upsert por (servicio, ciclo): cambiar el gasto dos veces en el mismo
 * mes deja una sola fila con el último valor, porque un mes no puede tener
 * dos gastos distintos.
 */
export async function recordExpense(
  client: PoolClient,
  serviceId: string,
  monthlyExpense: number,
  cycle: BillingCycle,
): Promise<void> {
  await client.query(
    `insert into service_expenses (service_id, cycle_month, cycle_year, monthly_expense)
     values ($1, $2, $3, $4)
     on conflict (service_id, cycle_year, cycle_month)
     do update set monthly_expense = excluded.monthly_expense, recorded_at = now()`,
    [serviceId, cycle.month, cycle.year, monthlyExpense],
  );
}
