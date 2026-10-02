import { z } from 'zod';

import { badRequest, json, noContent, notFound, parseBody, requireSession } from '@/lib/api';
import { query, queryOne } from '@/lib/db/pool';
import { type PaymentRow, toPayment } from '@/lib/mappers';

const SELECT =
  'select id, client_id, date_paid, amount_paid, cycle_month, cycle_year, note from payments';

const createSchema = z.object({
  clientId: z.string().min(1),
  amountPaid: z.number().positive().max(1_000_000),
  cycleMonth: z.number().int().min(1).max(12),
  cycleYear: z.number().int().min(2000).max(2100),
  datePaid: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

/** Filtra por cliente y/o por ciclo. Sin filtros devuelve todo el historial. */
export async function GET(request: Request) {
  const guard = await requireSession();
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const cycleMonth = searchParams.get('cycleMonth');
  const cycleYear = searchParams.get('cycleYear');

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (clientId) {
    params.push(clientId);
    conditions.push(`client_id = $${params.length}`);
  }
  if (cycleMonth && cycleYear) {
    params.push(Number(cycleMonth), Number(cycleYear));
    conditions.push(`cycle_month = $${params.length - 1} and cycle_year = $${params.length}`);
  }

  const where = conditions.length > 0 ? ` where ${conditions.join(' and ')}` : '';
  const rows = await query<PaymentRow>(`${SELECT}${where} order by date_paid desc`, params);
  return json(rows.map(toPayment));
}

/**
 * Registra el pago de un ciclo. El upsert va contra
 * unique (client_id, cycle_month, cycle_year), así que es atómico: no hay
 * forma de duplicar aunque lleguen dos peticiones a la vez.
 */
export async function POST(request: Request) {
  const guard = await requireSession();
  if (guard) return guard;

  const body = await parseBody(request, createSchema);
  if (body.response) return body.response;

  const client = await queryOne<{ id: string }>('select id from clients where id = $1', [
    body.data.clientId,
  ]);
  if (!client) return badRequest('client_not_found', 'Ese cliente no existe.');

  const row = await queryOne<PaymentRow>(
    `insert into payments (client_id, amount_paid, cycle_month, cycle_year, date_paid, note)
     values ($1, $2, $3, $4, coalesce($5::timestamptz, now()), $6)
     on conflict (client_id, cycle_month, cycle_year) do update
       set amount_paid = excluded.amount_paid,
           date_paid   = excluded.date_paid,
           note        = excluded.note
     returning id, client_id, date_paid, amount_paid, cycle_month, cycle_year, note`,
    [
      body.data.clientId,
      body.data.amountPaid,
      body.data.cycleMonth,
      body.data.cycleYear,
      body.data.datePaid ?? null,
      body.data.note ?? null,
    ],
  );

  return json(toPayment(row!), 201);
}

/** Deshacer el pago de un ciclo sin tener que saber su id. */
export async function DELETE(request: Request) {
  const guard = await requireSession();
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const cycleMonth = searchParams.get('cycleMonth');
  const cycleYear = searchParams.get('cycleYear');

  if (!clientId || !cycleMonth || !cycleYear) {
    return badRequest('missing_params', 'Faltan clientId, cycleMonth o cycleYear.');
  }

  const row = await queryOne<{ id: string }>(
    `delete from payments
     where client_id = $1 and cycle_month = $2 and cycle_year = $3
     returning id`,
    [clientId, Number(cycleMonth), Number(cycleYear)],
  );

  return row ? noContent() : notFound();
}
