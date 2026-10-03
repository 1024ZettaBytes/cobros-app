/**
 * Un "ciclo" es un mes calendario. El cobro de un servicio con billingDay = 5
 * vence el día 5 de cada mes; ese mes/año identifica al ciclo.
 */

export interface BillingCycle {
  /** 1-12 */
  month: number;
  year: number;
}

/** Ajusta el día de cobro a la longitud real del mes (31 en febrero -> 28/29). */
export function clampBillingDay(billingDay: number, month: number, year: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Math.min(Math.max(Math.trunc(billingDay), 1), daysInMonth);
}

/** Fecha de vencimiento del ciclo, a las 00:00 locales. */
export function getDueDate(billingDay: number, cycle: BillingCycle): Date {
  const day = clampBillingDay(billingDay, cycle.month, cycle.year);
  return new Date(cycle.year, cycle.month - 1, day, 0, 0, 0, 0);
}

/**
 * Número de mes absoluto. Sirve para comparar y restar ciclos sin pelearse
 * con el cambio de año: enero de 2027 va justo después de diciembre de 2026.
 */
export function toOrdinal(cycle: BillingCycle): number {
  return cycle.year * 12 + cycle.month;
}

/** Inversa de toOrdinal. */
export function fromOrdinal(ordinal: number): BillingCycle {
  // Diciembre cae en el múltiplo exacto de 12, así que hay que restar uno
  // antes de dividir para no empujarlo al año siguiente.
  const year = Math.floor((ordinal - 1) / 12);
  return { month: ordinal - year * 12, year };
}

/** Ciclo al que pertenece una fecha (por defecto, hoy). */
export function getCycleForDate(date: Date = new Date()): BillingCycle {
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}
