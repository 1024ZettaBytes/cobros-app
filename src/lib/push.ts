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

export function configurePush(): void {
  if (!isPushConfigured()) return;
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
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          dead.push(subscription.id);
          result.pruned += 1;
        } else {
          result.failed += 1;
        }
      }
    }),
  );

  if (dead.length > 0) {
    await query('delete from push_subscriptions where id = any($1::text[])', [dead]);
  }

  return result;
}
