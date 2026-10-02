import { api } from '@/api/client';

/**
 * El estado de sesión lo resuelve el servidor en el layout protegido; aquí
 * solo están las dos acciones que dispara el navegador.
 */
export const authApi = {
  login: (passphrase: string) => api.post<{ ok: true }>('/api/auth/login', { passphrase }),
  logout: () => api.post<{ ok: true }>('/api/auth/logout', {}),
};
