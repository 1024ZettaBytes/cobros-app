import { api } from '@/api/client';
import type { NewService, Service } from '@/types';

/**
 * Mutaciones de servicios desde el navegador. Las lecturas no están aquí:
 * los server components consultan Postgres directo (src/lib/queries.ts).
 */
export const servicesApi = {
  create: (data: NewService) => api.post<Service>('/api/services', data),

  /**
   * Cambiar el gasto mensual queda anotado en el historial a partir del ciclo
   * en curso; los meses anteriores conservan el gasto que tenían.
   */
  update: (id: string, data: Partial<NewService>) =>
    api.patch<Service>(`/api/services/${id}`, data),

  /** Borra en cascada sus clientes y los pagos de esos clientes. */
  remove: (id: string) => api.delete(`/api/services/${id}`),
};
