/** Variables que se pueden usar en la plantilla del recordatorio. */
export const TEMPLATE_VARIABLES = ['{Nombre}', '{Servicio}', '{Monto}', '{Fecha}'] as const;

export interface TemplateVariables {
  Nombre: string;
  Servicio: string;
  Monto: string;
  Fecha: string;
}

/**
 * Reemplaza {Variable} por su valor. No distingue mayúsculas, así que
 * {nombre} y {Nombre} funcionan igual. Lo que no reconoce lo deja tal cual.
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  const lookup = new Map(
    Object.entries(variables).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return template.replace(/\{(\w+)\}/g, (match, key: string) => lookup.get(key.toLowerCase()) ?? match);
}

/**
 * Número en formato internacional sin "+", como lo espera WhatsApp.
 * Toma los últimos 10 dígitos y antepone la lada de México.
 * Devuelve null si no junta 10 dígitos.
 */
function toWhatsAppPhone(phoneNumber: string): string | null {
  const national = phoneNumber.replace(/\D/g, '').slice(-10);
  if (national.length !== 10) return null;
  return `52${national}`;
}

/** wa.me abre WhatsApp Web o la app instalada, según el dispositivo. */
function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export type OpenWhatsAppResult = 'opened' | 'invalid_phone' | 'failed';

/**
 * Abre WhatsApp con el mensaje precargado, en otra pestaña.
 *
 * Es síncrona a propósito: `window.open` tiene que ejecutarse en el mismo tick
 * que el clic o el navegador lo bloquea como popup. Por eso quien llame a esto
 * no debe hacer `await` de nada antes (ver el caché de plantilla en
 * useReminder).
 */
export function openWhatsApp(phoneNumber: string, message: string): OpenWhatsAppResult {
  const phone = toWhatsAppPhone(phoneNumber);
  if (!phone) return 'invalid_phone';
  if (typeof window === 'undefined') return 'failed';

  const opened = window.open(buildWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer');
  return opened ? 'opened' : 'failed';
}
