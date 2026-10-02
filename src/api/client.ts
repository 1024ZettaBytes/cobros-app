/**
 * La API vive en la misma app de Next, así que siempre es el mismo origen:
 * rutas relativas y se acabó.
 */
export const API_BASE_URL = '';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** No hubo respuesta del servidor: sin red, servidor caído o URL mal configurada. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/** Se dispara en cualquier 401 para que la app mande al login. */
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      // Manda la cookie de sesión.
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(
      0,
      'network_error',
      'No se pudo conectar con el servidor. Revisa tu conexión.',
    );
  }

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError(401, 'unauthorized', 'Tu sesión expiró. Vuelve a entrar.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    throw new ApiError(
      response.status,
      body?.error ?? 'request_failed',
      body?.message ?? `El servidor respondió ${response.status}.`,
    );
  }

  // 204 No Content no trae cuerpo que parsear.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Convierte un 404 en null, que es lo que esperan las pantallas de detalle. */
export async function nullOn404<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

/** Mensaje legible para mostrarle al usuario. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Algo salió mal.';
}
