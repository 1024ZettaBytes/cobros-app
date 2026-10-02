import { api } from '@/api/client';
import type { Client, NewClient } from '@/types';

export const clientsApi = {
  create: (data: NewClient) => api.post<Client>('/api/clients', data),

  setActive: (id: string, isActive: boolean) =>
    api.patch<Client>(`/api/clients/${id}`, { isActive }),

  /** Borra en cascada su historial de pagos. */
  remove: (id: string) => api.delete(`/api/clients/${id}`),
};
