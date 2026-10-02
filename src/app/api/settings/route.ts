import { z } from 'zod';

import { json, parseBody, requireSession } from '@/lib/api';
import { queryOne } from '@/lib/db/pool';
import { type SettingsRow, toSettings } from '@/lib/mappers';

const SELECT =
  'select notification_time, whatsapp_template, notifications_enabled from settings where id = true';

const patchSchema = z.object({
  notificationTime: z.string().regex(/^[0-2][0-9]:[0-5][0-9]$/, 'formato HH:mm').optional(),
  whatsappTemplate: z.string().min(1).max(2000).optional(),
  notificationsEnabled: z.boolean().optional(),
});

export async function GET() {
  const guard = await requireSession();
  if (guard) return guard;

  const row = await queryOne<SettingsRow>(SELECT);
  return json(toSettings(row!));
}

export async function PATCH(request: Request) {
  const guard = await requireSession();
  if (guard) return guard;

  const body = await parseBody(request, patchSchema);
  if (body.response) return body.response;

  const row = await queryOne<SettingsRow>(
    `update settings set
       notification_time     = coalesce($1, notification_time),
       whatsapp_template     = coalesce($2, whatsapp_template),
       notifications_enabled = coalesce($3, notifications_enabled),
       updated_at            = now()
     where id = true
     returning notification_time, whatsapp_template, notifications_enabled`,
    [
      body.data.notificationTime ?? null,
      body.data.whatsappTemplate ?? null,
      body.data.notificationsEnabled ?? null,
    ],
  );

  return json(toSettings(row!));
}
