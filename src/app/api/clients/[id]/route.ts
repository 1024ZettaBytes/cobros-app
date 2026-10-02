import { z } from 'zod';

import { json, noContent, notFound, parseBody, requireSession } from '@/lib/api';
import { queryOne } from '@/lib/db/pool';
import { type ClientRow, toClient } from '@/lib/mappers';
import { SELECT } from '@/app/api/clients/route';

const RETURNING = 'id, service_id, name, phone_number, is_active, created_at';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phoneNumber: z.string().regex(/^[0-9]{10}$/, 'deben ser 10 dígitos').optional(),
  isActive: z.boolean().optional(),
});

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const guard = await requireSession();
  if (guard) return guard;

  const { id } = await params;
  const row = await queryOne<ClientRow>(`${SELECT} where id = $1`, [id]);
  return row ? json(toClient(row)) : notFound();
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireSession();
  if (guard) return guard;

  const body = await parseBody(request, patchSchema);
  if (body.response) return body.response;

  const { id } = await params;

  const row = await queryOne<ClientRow>(
    `update clients set
       name         = coalesce($2, name),
       phone_number = coalesce($3, phone_number),
       is_active    = coalesce($4, is_active)
     where id = $1
     returning ${RETURNING}`,
    [id, body.data.name ?? null, body.data.phoneNumber ?? null, body.data.isActive ?? null],
  );

  return row ? json(toClient(row)) : notFound();
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireSession();
  if (guard) return guard;

  const { id } = await params;
  // Sus pagos caen por `on delete cascade`.
  const row = await queryOne<{ id: string }>('delete from clients where id = $1 returning id', [id]);
  return row ? noContent() : notFound();
}
