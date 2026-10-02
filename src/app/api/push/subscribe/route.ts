import { z } from 'zod';

import { badRequest, json, parseBody, requireSession } from '@/lib/api';
import { query } from '@/lib/db/pool';

const schema = z.object({
  endpoint: z.string().min(1).max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
  }),
});

export async function POST(request: Request) {
  const guard = await requireSession();
  if (guard) return guard;

  const body = await parseBody(request, schema);
  if (body.response) return body.response;

  // El endpoint identifica al navegador: si vuelve a suscribirse, se
  // actualizan sus claves en vez de duplicar la fila.
  await query(
    `insert into push_subscriptions (endpoint, p256dh, auth, user_agent)
     values ($1, $2, $3, $4)
     on conflict (endpoint) do update
       set p256dh       = excluded.p256dh,
           auth         = excluded.auth,
           user_agent   = excluded.user_agent,
           last_seen_at = now()`,
    [
      body.data.endpoint,
      body.data.keys.p256dh,
      body.data.keys.auth,
      request.headers.get('user-agent'),
    ],
  );

  return json({ ok: true });
}

/** El endpoint va en la query: DELETE con cuerpo es incómodo de consumir. */
export async function DELETE(request: Request) {
  const guard = await requireSession();
  if (guard) return guard;

  const endpoint = new URL(request.url).searchParams.get('endpoint');
  if (!endpoint) return badRequest('missing_endpoint', 'Falta el endpoint.');

  await query('delete from push_subscriptions where endpoint = $1', [endpoint]);
  return json({ ok: true });
}
