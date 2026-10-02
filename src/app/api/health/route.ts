import { json } from '@/lib/api';
import { pool } from '@/lib/db/pool';

/**
 * Healthcheck para Railway. Sin sesión a propósito: el balanceador no tiene
 * cookie. No expone nada — solo confirma que el proceso llega a Postgres.
 */
export async function GET() {
  try {
    await pool.query('select 1');
    return json({ ok: true });
  } catch {
    return json({ ok: false }, 503);
  }
}
