import { env } from '@/lib/env';

export interface ZonedNow {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * Fecha y hora actuales en la zona horaria del usuario.
 *
 * El servidor bien puede correr en UTC, pero "avísame a las 9am" significa las
 * 9am de quien cobra. Trabajamos con los componentes de fecha, no con objetos
 * Date, para no arrastrar la zona del proceso.
 */
export function nowInTimeZone(date: Date = new Date(), timeZone = env.timeZone): ZonedNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type);
    return part ? Number(part.value) : 0;
  };

  // Algunas implementaciones devuelven la medianoche como hora 24.
  const hour = get('hour') % 24;

  return { year: get('year'), month: get('month'), day: get('day'), hour, minute: get('minute') };
}

/** "09:00" -> { hour: 9, minute: 0 }. Si viene mal formada, cae a las 9:00. */
export function parseTime(value: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return { hour: 9, minute: 0 };

  const hour = Math.min(Math.max(Number(match[1]), 0), 23);
  const minute = Math.min(Math.max(Number(match[2]), 0), 59);
  return { hour, minute };
}
