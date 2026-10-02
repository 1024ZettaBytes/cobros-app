import { json, requireSession } from '@/lib/api';
import { env } from '@/lib/env';
import { isPushConfigured } from '@/lib/push';

/** El navegador necesita la clave pública para suscribirse. */
export async function GET() {
  const guard = await requireSession();
  if (guard) return guard;

  return json({ publicKey: env.vapidPublicKey, configured: isPushConfigured() });
}
