import webpush from 'web-push';

import { query } from '@/lib/db/pool';
import { env } from '@/lib/env';

export interface PushPayload {
  title: string;
  body: string;
  /** Ruta de la app que se abre al tocar la notificación. */
  url?: string;
}

export function isPushConfigured(): boolean {
  return env.vapidPublicKey !== '' && env.vapidPrivateKey !== '';
}

/**
 * El `sub` del token VAPID tiene que ser un contacto real. Apple rechaza con
 * 403 los tokens cuyo subject apunta a un dominio que no existe, y el valor
 * por defecto (…@cobros.local) es justo eso.
 */
export function vapidSubjectLooksFake(subject = env.vapidSubject): boolean {
  return /\.local$|example\.com$/i.test(subject);
}

export function configurePush(): void {
  if (!isPushConfigured()) return;

  if (vapidSubjectLooksFake()) {
    console.warn(
      `[push] VAPID_SUBJECT es "${env.vapidSubject}". Apple rechaza los envíos con un contacto que no existe: usa tu correo real.`,
    );
  }

  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SendResult {
  sent: number;
  /** Suscripciones que el servicio de push ya no reconoce; se borran solas. */
  pruned: number;
  failed: number;
  /**
   * Detalle del último fallo. Sin esto, un envío que no llega es
   * indistinguible de uno que nunca se intentó.
   */
  lastError?: { statusCode?: number; message: string; body?: string };
}

/**
 * Manda el aviso a todos los navegadores suscritos.
 *
 * Un 404/410 significa que el navegador tiró la suscripción (se desinstaló la
 * PWA, se limpiaron datos). Esas se borran en vez de reintentarse para siempre.
 */
export async function sendToAll(payload: PushPayload): Promise<SendResult> {
  if (!isPushConfigured()) return { sent: 0, pruned: 0, failed: 0 };

  const subscriptions = await query<SubscriptionRow>(
    'select id, endpoint, p256dh, auth from push_subscriptions',
  );

  const result: SendResult = { sent: 0, pruned: 0, failed: 0 };
  const dead: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          { TTL: 12 * 60 * 60 },
        );
        result.sent += 1;
      } catch (error) {
        const detail = error as { statusCode?: number; body?: string; message?: string };
        const status = detail.statusCode;

        // 404/410: el navegador tiró la suscripción. Cualquier otro código es
        // un problema de configuración y hay que poder verlo.
        if (status === 404 || status === 410) {
          dead.push(subscription.id);
          result.pruned += 1;
        } else {
          result.failed += 1;
          result.lastError = {
            statusCode: status,
            message: detail.message ?? 'Error desconocido',
            body: typeof detail.body === 'string' ? detail.body.slice(0, 300) : undefined,
          };
          console.error('[push] envío fallido', status, detail.body ?? detail.message);
        }
      }
    }),
  );

  if (dead.length > 0) {
    await query('delete from push_subscriptions where id = any($1::text[])', [dead]);
  }

  return result;
}
