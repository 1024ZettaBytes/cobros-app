import { createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';

import { env } from '@/lib/env';

export { hashPassphrase, verifyPassphrase } from '@/lib/passphrase';

const SESSION_COOKIE = 'cobros_session';

/**
 * La cookie va firmada: `payload.firma`. Sin la firma, cualquiera podría
 * escribir su propia cookie y entrar. Next no firma cookies por su cuenta,
 * así que lo hacemos con un HMAC.
 */
function sign(payload: string): string {
  return createHmac('sha256', env.sessionSecret).update(payload).digest('base64url');
}

function verifySignature(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

interface SessionPayload {
  /** Emitida en (epoch ms). */
  iat: number;
}

export async function issueSession(): Promise<void> {
  const payload = Buffer.from(JSON.stringify({ iat: Date.now() } satisfies SessionPayload)).toString(
    'base64url',
  );

  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // En desarrollo servimos por http://localhost, donde `secure` impediría
    // que el navegador guarde la cookie.
    secure: env.isProduction,
    maxAge: env.sessionDays * 24 * 60 * 60,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function hasValidSession(): Promise<boolean> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return false;

  const separator = raw.lastIndexOf('.');
  if (separator === -1) return false;

  const payload = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  if (!verifySignature(payload, signature)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionPayload;
    const ageMs = Date.now() - parsed.iat;
    return ageMs >= 0 && ageMs < env.sessionDays * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}
