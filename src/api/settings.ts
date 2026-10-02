import { api } from '@/api/client';
import type { AppSettings } from '@/types';

/** Valores que usa la interfaz mientras carga; el servidor es la fuente real. */
export const DEFAULT_SETTINGS: AppSettings = {
  notificationTime: '09:00',
  whatsappTemplate:
    'Hola {Nombre} 👋\n\nTe recuerdo el pago de *{Servicio}* por *{Monto}*, con fecha de corte el {Fecha}.\n\n¡Gracias!',
  notificationsEnabled: true,
};

export const settingsApi = {
  get: () => api.get<AppSettings>('/api/settings'),
  update: (patch: Partial<AppSettings>) => api.patch<AppSettings>('/api/settings', patch),
};
