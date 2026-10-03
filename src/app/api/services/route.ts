import { z } from 'zod';

import { json, parseBody, requireSession } from '@/lib/api';
import { query, withTransaction } from '@/lib/db/pool';
import { type ServiceRow, toService } from '@/lib/mappers';
import { recordExpense } from '@/lib/service-expenses';
import { getCycleForDate } from '@/utils/cycle';

export const COLUMNS = 'id, name, client_price, monthly_expense, billing_day, created_at';
export const SELECT = `select ${COLUMNS} from services`;

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  clientPrice: z.number().positive().max(1_000_000),
  monthlyExpense: z.number().min(0).max(1_000_000),
  billingDay: z.number().int().min(1).max(31),
});

export async function GET() {
  const guard = await requireSession();
  if (guard) return guard;

  const rows = await query<ServiceRow>(`${SELECT} order by name`);
  return json(rows.map(toService));
}

export async function POST(request: Request) {
  const guard = await requireSession();
  if (guard) return guard;

  const body = await parseBody(request, createSchema);
  if (body.response) return body.response;

  // El servicio y la primera fila de su historial de gasto entran juntos: un
  // servicio sin gasto registrado desaparecería de las gráficas de ese mes.
  const service = await withTransaction(async (client) => {
    const result = await client.query<ServiceRow>(
      `insert into services (name, client_price, monthly_expense, billing_day)
       values ($1, $2, $3, $4)
       returning ${COLUMNS}`,
      [body.data.name, body.data.clientPrice, body.data.monthlyExpense, body.data.billingDay],
    );

    const row = result.rows[0];
    await recordExpense(client, row.id, row.monthly_expense, getCycleForDate());
    return toService(row);
  });

  return json(service, 201);
}
