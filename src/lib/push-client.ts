import { pushApi } from '@/api';

/**
 * Suscripción a Web Push desde el navegador.
 *
 * Requisitos que no son obvios:
 *  - Hace falta HTTPS (localhost es la excepción) o no hay service worker.
 *  - En iPhone solo funciona si la PWA está agregada a la pantalla de inicio.
 *  - Esto se renderiza también en el servidor, donde no existe `window`.
 */

export interface PushState {
  supported: boolean;
  permissionGranted: boolean;
  /** Este navegador está suscrito. */
  subscribed: boolean;
  /** Cuántos dispositivos recibirán los avisos. */
  devices: number;
  /** El servidor tiene claves VAPID. */
  configured: boolean;
}

function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
}

/**
 * La clave VAPID viaja en base64url; el navegador la quiere como bytes.
 * El tipo explícito importa: applicationServerKey exige un ArrayBuffer real.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);

  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;

  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  // `register` resuelve antes de que el worker esté activo; sin esto, la
  // primera suscripción falla en un arranque en frío.
  return navigator.serviceWorker.ready;
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) {
    return {
      supported: false,
      permissionGranted: false,
      subscribed: false,
      devices: 0,
      configured: false,
    };
  }

  const [{ configured, subscriptions }, registration] = await Promise.all([
    pushApi.status(),
    navigator.serviceWorker.getRegistration('/'),
  ]);

  const subscription = await registration?.pushManager.getSubscription();

  return {
    supported: true,
    permissionGranted: Notification.permission === 'granted',
    subscribed: Boolean(subscription),
    devices: subscriptions,
    configured,
  };
}

export type EnablePushResult = 'ok' | 'unsupported' | 'denied' | 'not_configured';

export async function enablePush(): Promise<EnablePushResult> {
  if (!pushSupported()) return 'unsupported';

  // "denied" es definitivo: se cambia desde los ajustes del navegador.
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') {
    if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  }

  const { publicKey, configured } = await pushApi.publicKey();
  if (!configured || !publicKey) return 'not_configured';

  const registration = await getRegistration();
  if (!registration) return 'unsupported';

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      // Sin esto Chrome rechaza la suscripción: exige que todo push se muestre.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) return 'unsupported';

  await pushApi.subscribe(subscription.endpoint, {
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });

  return 'ok';
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  // Primero le avisamos al servidor: si falla el unsubscribe local, al menos
  // dejamos de recibir avisos.
  await pushApi.unsubscribe(subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe();
}
