import { z } from 'zod';

import { json, noContent, notFound, parseBody, requireSession } from '@/lib/api';
import { queryOne } from '@/lib/db/pool';
import { type ServiceRow, toService } from '@/lib/mappers';
import { SELECT } from '@/app/api/services/route';

const RETURNING = 'id, name, client_price, monthly_expense, billing_day, created_at';

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

  // Solo tocamos las columnas que vinieron en el patch.
  const row = await queryOne<ServiceRow>(
    `update services set
       name            = coalesce($2, name),
       client_price    = coalesce($3, client_price),
       monthly_expense = coalesce($4, monthly_expense),
       billing_day     = coalesce($5, billing_day)
     where id = $1
     returning ${RETURNING}`,
    [
      id,
      body.data.name ?? null,
      body.data.clientPrice ?? null,
      body.data.monthlyExpense ?? null,
      body.data.billingDay ?? null,
    ],
  );

  return row ? json(toService(row)) : notFound();
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireSession();
  if (guard) return guard;

  const { id } = await params;
  // Los clientes y sus pagos caen por `on delete cascade`.
  const row = await queryOne<{ id: string }>('delete from services where id = $1 returning id', [id]);
  return row ? noContent() : notFound();
}
