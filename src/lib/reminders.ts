import { query, queryOne } from '@/lib/db/pool';
import { env } from '@/lib/env';
import { isPushConfigured, sendToAll } from '@/lib/push';
import { nowInTimeZone, parseTime } from '@/lib/time';
import { clampBillingDay } from '@/utils/cycle';
import { formatCurrency } from '@/utils/format';

interface DueService {
  id: string;
  name: string;
  billing_day: number;
  client_price: number;
  active_clients: number;
}

/**
 * Revisa si hoy toca avisar de algún servicio y manda el push.
 *
 * Idempotente: antes de mandar "reclama" el aviso insertando en sent_reminders.
 * Si la inserción choca con la clave primaria, es que ya se mandó y se salta.
 * Eso vuelve inofensivo que el intervalo se traslape o que el proceso reinicie.
 */
export async function runReminderCheck(now: Date = new Date()): Promise<number> {
  if (!isPushConfigured()) return 0;

  const settings = await queryOne<{ notification_time: string; notifications_enabled: boolean }>(
    'select notification_time, notifications_enabled from settings where id = true',
  );
  if (!settings?.notifications_enabled) return 0;

  const { hour, minute } = parseTime(settings.notification_time);
  const zoned = nowInTimeZone(now);

  // Todavía no es la hora del aviso de hoy.
  if (zoned.hour * 60 + zoned.minute < hour * 60 + minute) return 0;

  const services = await query<DueService>(
    `select s.id, s.name, s.billing_day, s.client_price,
            count(c.id) filter (where c.is_active) ::int as active_clients
       from services s
       left join clients c on c.service_id = s.id
      group by s.id`,
  );

  let sent = 0;

  for (const service of services) {
    if (service.active_clients === 0) continue;

    // El día 31 cae en 28/30 según el mes.
    const dueDay = clampBillingDay(service.billing_day, zoned.month, zoned.year);
    if (dueDay !== zoned.day) continue;

    const claimed = await queryOne<{ service_id: string }>(
      `insert into sent_reminders (service_id, cycle_month, cycle_year)
       values ($1, $2, $3)
       on conflict do nothing
       returning service_id`,
      [service.id, zoned.month, zoned.year],
    );

    // Otro tick ya lo mandó.
    if (!claimed) continue;

    try {
      await sendToAll({
        title: `Hoy toca cobrar ${service.name}`,
        body: `${service.active_clients} ${service.active_clients === 1 ? 'cliente' : 'clientes'} · ${formatCurrency(service.client_price * service.active_clients)} por cobrar`,
        url: `/service/${service.id}`,
      });
      sent += 1;
    } catch (error) {
      // Si falló del todo, soltamos la reclamación para reintentar al rato.
      await query(
        'delete from sent_reminders where service_id = $1 and cycle_month = $2 and cycle_year = $3',
        [service.id, zoned.month, zoned.year],
      );
      throw error;
    }
  }

  return sent;
}

/** Arranca el ciclo de revisión. Devuelve la función para detenerlo. */
export function startReminderCron(log: {
  info: (message: string) => void;
  error: (message: string) => void;
}): () => void {
  let running = false;

  async function tick(): Promise<void> {
    // Evita que dos revisiones se encimen si una tarda más que el intervalo.
    if (running) return;
    running = true;

    try {
      const sent = await runReminderCheck();
      if (sent > 0) log.info(`[recordatorios] avisos mandados: ${sent}`);
    } catch (error) {
      log.error(`[recordatorios] falló la revisión: ${String(error)}`);
    } finally {
      running = false;
    }
  }

  void tick();
  const timer = setInterval(() => void tick(), env.reminderIntervalMinutes * 60_000);

  return () => clearInterval(timer);
}
