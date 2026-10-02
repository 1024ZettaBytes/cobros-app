'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { authApi, describeError, pushApi, settingsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { ErrorBanner } from '@/components/ui/error-banner';
import { disablePush, enablePush, getPushState, type PushState } from '@/lib/push-client';
import type { AppSettings } from '@/types';
import { renderTemplate, TEMPLATE_VARIABLES, type TemplateVariables } from '@/utils/whatsapp';

/** Datos de ejemplo para la vista previa. */
const SAMPLE: TemplateVariables = {
  Nombre: 'Ana García',
  Servicio: 'Starlink Casa',
  Monto: '$350',
  Fecha: '5 de octubre',
};

const DEFAULT_TEMPLATE =
  'Hola {Nombre} 👋\n\nTe recuerdo el pago de *{Servicio}* por *{Monto}*, con fecha de corte el {Fecha}.\n\n¡Gracias!';

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const dialog = useDialog();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [template, setTemplate] = useState(settings.whatsappTemplate);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);
  const [notificationTime, setNotificationTime] = useState(settings.notificationTime);
  const [push, setPush] = useState<PushState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    void getPushState().then(setPush).catch(() => setPush(null));
  }, []);

  const preview = useMemo(() => renderTemplate(template, SAMPLE), [template]);

  /** Inserta la variable donde está el cursor, no al final del texto. */
  function insertVariable(variable: string) {
    const editor = editorRef.current;
    const start = editor?.selectionStart ?? template.length;
    const end = editor?.selectionEnd ?? template.length;

    setTemplate(template.slice(0, start) + variable + template.slice(end));

    // El cursor se repone después de que React pinta el valor nuevo.
    requestAnimationFrame(() => {
      const caret = start + variable.length;
      editor?.focus();
      editor?.setSelectionRange(caret, caret);
    });
  }

  async function toggleNotifications(enabled: boolean) {
    if (!enabled) {
      setNotificationsEnabled(false);
      await disablePush();
      setPush(await getPushState());
      return;
    }

    const result = await enablePush();
    setPush(await getPushState());

    if (result === 'ok') {
      setNotificationsEnabled(true);
      return;
    }

    const messages: Record<Exclude<typeof result, 'ok'>, string> = {
      denied:
        'Tu navegador bloqueó las notificaciones. Habilítalas desde el candado junto a la dirección del sitio.',
      unsupported:
        'Este navegador no soporta avisos. En iPhone, agrega la app a la pantalla de inicio desde Compartir → Añadir a inicio.',
      not_configured: 'El servidor no tiene claves VAPID configuradas.',
    };

    await dialog.alert('No se pudieron activar', messages[result]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    setError(null);

    try {
      await settingsApi.update({ whatsappTemplate: template, notificationsEnabled, notificationTime });
      router.refresh();
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    setIsTesting(true);

    try {
      const result = await pushApi.sendTest();
      await dialog.alert(
        result.sent > 0 ? 'Aviso de prueba enviado' : 'No se envió a ningún dispositivo',
        result.sent > 0
          ? 'Debería llegarte en unos segundos.'
          : 'No hay navegadores suscritos. Activa los recordatorios primero.',
      );
    } catch (cause) {
      await dialog.alert('No se pudo enviar', describeError(cause));
    } finally {
      setIsTesting(false);
    }
  }

  async function confirmLogout() {
    const confirmed = await dialog.confirm({
      title: '¿Cerrar sesión?',
      message: 'Tendrás que escribir tu passphrase para volver a entrar.',
      confirmLabel: 'Cerrar sesión',
      destructive: true,
    });

    if (!confirmed) return;

    await authApi.logout();
    router.replace('/login');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {error && <ErrorBanner message={error} />}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold">Recordatorios</p>
            <p className="text-sm text-muted">Un aviso el día de corte de cada servicio.</p>
          </div>

          <input
            type="checkbox"
            role="switch"
            aria-label="Activar recordatorios"
            checked={notificationsEnabled}
            onChange={(event) => void toggleNotifications(event.target.checked)}
            className="size-6 accent-accent"
          />
        </div>

        {notificationsEnabled && (
          <>
            <label className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-surface px-4">
              <span className="text-sm font-bold">Hora del aviso</span>
              <input
                type="time"
                value={notificationTime}
                onChange={(event) => setNotificationTime(event.target.value)}
                className="rounded-lg border border-line bg-bg px-2 py-1 text-base"
              />
            </label>

            {push && (
              <p className="text-sm text-muted">
                {!push.supported
                  ? 'Este navegador no soporta avisos. En iPhone, agrega la app a la pantalla de inicio.'
                  : !push.configured
                    ? 'El servidor no tiene claves VAPID configuradas.'
                    : push.devices === 1
                      ? '1 dispositivo recibirá los avisos.'
                      : `${push.devices} dispositivos recibirán los avisos.`}
              </p>
            )}

            {push?.devices ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleTest()}
                loading={isTesting}>
                Mandar aviso de prueba
              </Button>
            ) : null}
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="template" className="text-sm font-bold">
          Plantilla del recordatorio
        </label>
        <p className="text-sm text-muted">
          Este es el mensaje que se precarga en WhatsApp. Toca una variable para insertarla donde
          esté el cursor.
        </p>

        <textarea
          id="template"
          ref={editorRef}
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
          rows={6}
          className="rounded-xl border border-line bg-surface p-4 text-base leading-relaxed outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />

        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertVariable(variable)}
              className="rounded-full bg-surface-2 px-3 py-1 text-sm transition-opacity hover:opacity-80">
              {variable}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-bold">Vista previa</p>
        <p className="rounded-xl bg-surface p-4 text-sm whitespace-pre-wrap">{preview}</p>
        <p className="text-sm text-muted">Con datos de ejemplo. Cada cliente recibe los suyos.</p>
      </section>

      <div className="flex flex-col gap-2">
        <Button type="submit" loading={isSaving}>
          Guardar
        </Button>
        <Button type="button" variant="secondary" onClick={() => setTemplate(DEFAULT_TEMPLATE)}>
          Restaurar plantilla original
        </Button>
      </div>

      <Button type="button" variant="danger" onClick={() => void confirmLogout()}>
        Cerrar sesión
      </Button>
    </form>
  );
}
