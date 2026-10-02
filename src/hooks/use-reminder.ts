'use client';

import { useCallback, useEffect, useRef } from 'react';

import { DEFAULT_SETTINGS, settingsApi } from '@/api';
import { useDialog } from '@/components/ui/dialog';
import type { Client, Service } from '@/types';
import { formatCurrency, formatDueDate } from '@/utils/format';
import { openWhatsApp, renderTemplate, type TemplateVariables } from '@/utils/whatsapp';

/** Arma los valores de las variables de la plantilla para un cobro concreto. */
function buildReminderVariables(
  client: Client,
  service: Service,
  dueDate: Date,
): TemplateVariables {
  return {
    Nombre: client.name,
    Servicio: service.name,
    Monto: formatCurrency(service.clientPrice),
    Fecha: formatDueDate(dueDate),
  };
}

export function useReminder() {
  const dialog = useDialog();

  /**
   * La plantilla se cachea a propósito: no podemos hacer `await` antes de
   * abrir la pestaña de WhatsApp, o el navegador la bloquea como popup.
   */
  const template = useRef<string>(DEFAULT_SETTINGS.whatsappTemplate);

  useEffect(() => {
    void settingsApi
      .get()
      .then((settings) => {
        template.current = settings.whatsappTemplate;
      })
      .catch(() => {
        // Si falla, seguimos con la última plantilla conocida.
      });
  }, []);

  const sendReminder = useCallback(
    async (client: Client, service: Service, dueDate: Date): Promise<void> => {
      const message = renderTemplate(
        template.current,
        buildReminderVariables(client, service, dueDate),
      );

      // Sin await antes de esta línea: ver el comentario de openWhatsApp.
      const result = openWhatsApp(client.phoneNumber, message);

      if (result === 'invalid_phone') {
        await dialog.alert(
          'Teléfono inválido',
          `El número de ${client.name} no tiene 10 dígitos. Edítalo para poder mandarle el recordatorio.`,
        );
        return;
      }

      if (result === 'failed') {
        await dialog.alert(
          'No se pudo abrir WhatsApp',
          'Puede que el navegador haya bloqueado la ventana emergente. Permítelas para este sitio.',
        );
      }
    },
    [dialog],
  );

  return { sendReminder };
}
