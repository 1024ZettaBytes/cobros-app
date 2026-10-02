import { json, requireSession } from '@/lib/api';
import { queryOne } from '@/lib/db/pool';
import { isPushConfigured } from '@/lib/push';

/** Cuántos navegadores recibirán los avisos. */
export async function GET() {
  const guard = await requireSession();
  if (guard) return guard;

  const row = await queryOne<{ count: string }>('select count(*) from push_subscriptions');
  return json({ configured: isPushConfigured(), subscriptions: Number(row?.count ?? 0) });
}
