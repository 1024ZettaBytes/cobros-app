import { z } from 'zod';

import { badRequest, json, parseBody, requireSession } from '@/lib/api';
import { query, queryOne } from '@/lib/db/pool';
import { type ClientRow, toClient } from '@/lib/mappers';

export const SELECT =
  'select id, service_id, name, phone_number, is_active, created_at from clients';

const createSchema = z.object({
  serviceId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  // 10 dígitos nacionales; la lada +52 se agrega al abrir WhatsApp.
  phoneNumber: z.string().regex(/^[0-9]{10}$/, 'deben ser 10 dígitos'),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  const guard = await requireSession();
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('serviceId');
  const onlyActive = searchParams.get('onlyActive') === 'true';

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (serviceId) {
    params.push(serviceId);
    conditions.push(`service_id = $${params.length}`);
  }
  if (onlyActive) conditions.push('is_active');

  const where = conditions.length > 0 ? ` where ${conditions.join(' and ')}` : '';
  const rows = await query<ClientRow>(`${SELECT}${where} order by name`, params);
  return json(rows.map(toClient));
}

export async function POST(request: Request) {
  const guard = await requireSession();
  if (guard) return guard;

  const body = await parseBody(request, createSchema);
  if (body.response) return body.response;

  const service = await queryOne<{ id: string }>('select id from services where id = $1', [
    body.data.serviceId,
  ]);
  if (!service) return badRequest('service_not_found', 'Ese servicio no existe.');

  const row = await queryOne<ClientRow>(
    `insert into clients (service_id, name, phone_number, is_active)
     values ($1, $2, $3, coalesce($4, true))
     returning id, service_id, name, phone_number, is_active, created_at`,
    [body.data.serviceId, body.data.name, body.data.phoneNumber, body.data.isActive ?? null],
  );

  return json(toClient(row!), 201);
}
