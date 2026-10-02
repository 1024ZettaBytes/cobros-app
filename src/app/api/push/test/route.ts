import { json, requireSession } from '@/lib/api';
import { configurePush, isPushConfigured, sendToAll } from '@/lib/push';

/** Dispara un aviso de prueba a todos los navegadores suscritos. */
export async function POST() {
  const guard = await requireSession();
  if (guard) return guard;

  if (!isPushConfigured()) {
    return json({ error: 'push_not_configured' }, 503);
  }

  configurePush();

  return json(
    await sendToAll({
      title: 'Prueba de CobrosApp',
      body: 'Si ves esto, los recordatorios van a llegarte bien.',
      url: '/',
    }),
  );
}
