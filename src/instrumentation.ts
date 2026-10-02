/**
 * Arranque del servidor: migraciones, push y el cron de recordatorios.
 *
 * Next ejecuta `register()` una sola vez cuando levanta el proceso. Es el
 * lugar natural para el trabajo en segundo plano que en Railway corre dentro
 * del mismo servicio.
 */
export async function register(): Promise<void> {
  // El runtime edge no tiene Postgres ni temporizadores largos.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { migrate } = await import('@/lib/db/migrate');
  const { configurePush, isPushConfigured } = await import('@/lib/push');
  const { startReminderCron } = await import('@/lib/reminders');

  await migrate();

  configurePush();
  if (!isPushConfigured()) {
    console.warn(
      '[push] Sin claves VAPID: los avisos están apagados. Genera unas con npm run generate-vapid.',
    );
  }

  // En desarrollo Next recarga módulos; sin esta guarda quedarían varios
  // temporizadores corriendo a la vez.
  const globalForCron = globalThis as unknown as { cobrosCronStarted?: boolean };
  if (globalForCron.cobrosCronStarted) return;
  globalForCron.cobrosCronStarted = true;

  startReminderCron({
    info: (message) => console.log(message),
    error: (message) => console.error(message),
  });
}
