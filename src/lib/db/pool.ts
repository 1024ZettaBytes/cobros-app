import pg from 'pg';

import { env } from '@/lib/env';

// Por defecto pg devuelve numeric como string para no perder precisión.
// Aquí los montos caben de sobra en un número de JS, así que los convertimos.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

/**
 * En desarrollo Next recarga los módulos en cada cambio. Sin este caché
 * global, cada recarga abriría un pool nuevo hasta agotar las conexiones de
 * Postgres.
 */
/**
 * Postgres gestionado (Railway, RDS) suele presentar certificados firmados
 * por su propia CA. Activamos TLS cuando la URL lo pide; la validación del
 * certificado se relaja porque esa CA no está en el almacén del sistema.
 * El tráfico va cifrado de todos modos.
 */
function sslOptions(connectionString: string): pg.PoolConfig['ssl'] {
  const requested =
    /[?&]sslmode=(require|verify-ca|verify-full)/.test(connectionString) ||
    process.env.PGSSL === 'true';

  return requested ? { rejectUnauthorized: false } : undefined;
}

const globalForPg = globalThis as unknown as { cobrosPool?: pg.Pool };

export const pool =
  globalForPg.cobrosPool ??
  new pg.Pool({
    connectionString: env.databaseUrl,
    ssl: sslOptions(env.databaseUrl),
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== 'production') globalForPg.cobrosPool = pool;

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Todo o nada: hace rollback si el callback lanza. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
