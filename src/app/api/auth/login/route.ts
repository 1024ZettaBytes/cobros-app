import { z } from 'zod';

import { badRequest, clientIp, json, parseBody, rateLimit } from '@/lib/api';
import { issueSession, verifyPassphrase } from '@/lib/auth';
import { env } from '@/lib/env';

const schema = z.object({ passphrase: z.string().min(1).max(200) });

export async function POST(request: Request) {
  // Sin esto, la passphrase es adivinable por fuerza bruta.
  if (!rateLimit(`login:${clientIp(request)}`, 10, 5 * 60 * 1000)) {
    return badRequest('too_many_attempts', 'Demasiados intentos. Espera unos minutos.');
  }

  const body = await parseBody(request, schema);
  if (body.response) return body.response;

  if (!(await verifyPassphrase(body.data.passphrase, env.passphraseHash))) {
    return json({ error: 'invalid_passphrase' }, 401);
  }

  await issueSession();
  return json({ ok: true });
}
