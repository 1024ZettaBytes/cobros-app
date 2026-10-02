import { api } from '@/api/client';

export interface PushKeys {
  p256dh: string;
  auth: string;
}

export const pushApi = {
  /** Clave pública VAPID con la que el navegador arma la suscripción. */
  publicKey: () => api.get<{ publicKey: string; configured: boolean }>('/api/push/public-key'),

  subscribe: (endpoint: string, keys: PushKeys) =>
    api.post<{ ok: true }>('/api/push/subscribe', { endpoint, keys }),

  unsubscribe: (endpoint: string) =>
    api.delete<{ ok: true }>(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`),

  status: () => api.get<{ configured: boolean; subscriptions: number }>('/api/push/status'),

  sendTest: () => api.post<{ sent: number; pruned: number; failed: number }>('/api/push/test', {}),
};
