import type { ZodType } from 'zod';

import { hasValidSession } from '@/lib/auth';

/**
 * Helpers compartidos por los route handlers. Lo que en Fastify hacían el hook
 * global de sesión y los esquemas JSON, aquí es explícito en cada ruta.
 */

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function badRequest(error: string, message?: string): Response {
  return json({ error, message }, 400);
}

export function notFound(): Response {
  return json({ error: 'not_found' }, 404);
}

export function unauthorized(): Response {
  return json({ error: 'unauthorized', message: 'Sesión inválida o expirada.' }, 401);
}

/**
 * Devuelve una respuesta 401 si no hay sesión, o null si puede seguir.
 *
 * Es explícito a propósito en vez de un middleware: el middleware de Next
 * corre en el runtime edge, donde no está node:crypto, y la firma de la
 * cookie usa HMAC de Node.
 */
export async function requireSession(): Promise<Response | null> {
  return (await hasValidSession()) ? null : unauthorized();
}

type ParsedBody<T> = { data: T; response?: never } | { data?: never; response: Response };

/** Valida el cuerpo contra el esquema; si falla, trae la respuesta 400 lista. */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<ParsedBody<T>> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return { response: badRequest('invalid_json', 'El cuerpo no es JSON válido.') };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      response: badRequest(
        'validation_failed',
        first ? `${first.path.join('.') || 'cuerpo'}: ${first.message}` : 'Datos inválidos.',
      ),
    };
  }

  return { data: result.data };
}

/**
 * Límite de intentos en memoria para el login.
 *
 * Se reinicia con cada despliegue y no se comparte entre instancias; para una
 * app de un solo usuario alcanza. Si algún día corre replicada, esto se mueve
 * a Postgres o Redis.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count += 1;
  return true;
}

/** IP del cliente, respetando el proxy de Railway. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'desconocida';
}
