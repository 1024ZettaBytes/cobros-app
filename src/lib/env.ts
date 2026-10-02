/**
 * Configuración desde variables de entorno.
 *
 * Los valores se leen con getters, no al importar el módulo: Next evalúa los
 * módulos durante `next build`, y validar ahí tumbaría el build en cualquier
 * entorno que todavía no tenga los secretos. Así falla al atender la petición,
 * que es cuando de verdad hacen falta.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Falta la variable de entorno ${name}. Revisa .env.example`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

export const env = {
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },

  get databaseUrl(): string {
    return required('DATABASE_URL');
  },

  get sessionSecret(): string {
    const value = required('SESSION_SECRET');
    if (value.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
    return value;
  },

  /** Hash scrypt generado con `npm run hash-passphrase`. */
  get passphraseHash(): string {
    return required('APP_PASSPHRASE_HASH');
  },

  /** Días que dura la sesión antes de pedir la passphrase otra vez. */
  get sessionDays(): number {
    return Number(optional('SESSION_DAYS', '30'));
  },

  // --- Web Push ---
  get vapidPublicKey(): string {
    return optional('VAPID_PUBLIC_KEY', '');
  },

  get vapidPrivateKey(): string {
    return optional('VAPID_PRIVATE_KEY', '');
  },

  /** Contacto que exigen los servicios de push. */
  get vapidSubject(): string {
    return optional('VAPID_SUBJECT', 'mailto:no-reply@cobros.local');
  },

  /**
   * Zona horaria del usuario. El servidor puede correr en UTC, pero "las 9am"
   * significan las 9am de quien cobra.
   */
  get timeZone(): string {
    return optional('APP_TIMEZONE', 'America/Mexico_City');
  },

  /** Cada cuántos minutos revisa el cron si toca mandar avisos. */
  get reminderIntervalMinutes(): number {
    return Number(optional('REMINDER_INTERVAL_MINUTES', '1'));
  },
} as const;
