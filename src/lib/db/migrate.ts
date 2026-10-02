import { migrations } from '@/lib/db/migrations';
import { pool, query, withTransaction } from '@/lib/db/pool';

/** Número arbitrario pero fijo: identifica a este candado. */
const MIGRATION_LOCK_ID = 4815162342;

/**
 * Aplica las migraciones pendientes en orden. Cada una corre dentro de su
 * propia transacción y se registra por nombre, así que volver a correr esto
 * no hace nada.
 */
export async function migrate(): Promise<string[]> {
  // Candado de Postgres: si Railway levanta dos instancias a la vez, solo una
  // aplica las migraciones y la otra espera a que termine.
  const lock = await pool.connect();
  await lock.query('select pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

  try {
    await query(`
      create table if not exists _migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const applied = new Set(
      (await query<{ name: string }>('select name from _migrations')).map((row) => row.name),
    );

    const pending = migrations.filter((migration) => !applied.has(migration.name));

    for (const migration of pending) {
      await withTransaction(async (client) => {
        await client.query(migration.sql);
        await client.query('insert into _migrations (name) values ($1)', [migration.name]);
      });

      console.log(`[migrate] aplicada ${migration.name}`);
    }

    return pending.map((migration) => migration.name);
  } finally {
    await lock.query('select pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    lock.release();
  }
}
