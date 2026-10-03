import { z } from 'zod';

import { json, noContent, notFound, parseBody, requireSession } from '@/lib/api';
import { queryOne, withTransaction } from '@/lib/db/pool';
import { type ServiceRow, toService } from '@/lib/mappers';
import { recordExpense } from '@/lib/service-expenses';
import { COLUMNS, SELECT } from '@/app/api/services/route';
import { getCycleForDate } from '@/utils/cycle';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  clientPrice: z.number().positive().max(1_000_000).optional(),
  monthlyExpense: z.number().min(0).max(1_000_000).optional(),
  billingDay: z.number().int().min(1).max(31).optional(),
});

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const guard = await requireSession();
  if (guard) return guard;

  const { id } = await params;
  const row = await queryOne<ServiceRow>(`${SELECT} where id = $1`, [id]);
  return row ? json(toService(row)) : notFound();
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireSession();
  if (guard) return guard;

  const body = await parseBody(request, patchSchema);
  if (body.response) return body.response;

  const { id } = await params;

  const service = await withTransaction(async (client) => {
    // `for update` bloquea la fila: dos ediciones simultáneas no pueden leer
    // el mismo gasto previo y anotar historiales contradictorios.
    const before = await client.query<{ monthly_expense: number }>(
      'select monthly_expense from services where id = $1 for update',
      [id],
    );
    if (before.rowCount === 0) return null;

    // Solo tocamos las columnas que vinieron en el patch.
    const updated = await client.query<ServiceRow>(
      `update services set
         name            = coalesce($2, name),
         client_price    = coalesce($3, client_price),
         monthly_expense = coalesce($4, monthly_expense),
         billing_day     = coalesce($5, billing_day)
       where id = $1
       returning ${COLUMNS}`,
      [
        id,
        body.data.name ?? null,
        body.data.clientPrice ?? null,
        body.data.monthlyExpense ?? null,
        body.data.billingDay ?? null,
      ],
    );

    const row = updated.rows[0];

    // El historial solo crece cuando el gasto de verdad cambió; renombrar un
    // servicio no tiene por qué dejar una fila idéntica a la anterior.
    if (row.monthly_expense !== before.rows[0].monthly_expense) {
      await recordExpense(client, id, row.monthly_expense, getCycleForDate());
    }

    return toService(row);
  });

  return service ? json(service) : notFound();
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireSession();
  if (guard) return guard;

  const { id } = await params;
  // Los clientes y sus pagos caen por `on delete cascade`.
  const row = await queryOne<{ id: string }>('delete from services where id = $1 returning id', [id]);
  return row ? noContent() : notFound();
}
