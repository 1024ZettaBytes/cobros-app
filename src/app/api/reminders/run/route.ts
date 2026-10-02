import { json, requireSession } from '@/lib/api';
import { runReminderCheck } from '@/lib/reminders';

/**
 * Fuerza la revisión de recordatorios sin esperar al siguiente tick del cron.
 *
 * Es idempotente: respeta la tabla sent_reminders, así que llamarlo de más no
 * manda avisos repetidos. Sirve para depurar en producción y para las pruebas.
 */
export async function POST() {
  const guard = await requireSession();
  if (guard) return guard;

  return json({ sent: await runReminderCheck() });
}
