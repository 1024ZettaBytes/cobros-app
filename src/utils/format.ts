import type { BillingCycle } from '@/utils/cycle';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

/** $1,100 — sin centavos, que es como se manejan estos cobros. */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(Math.round(amount));
}

/** "octubre 2026" */
export function formatCycle(cycle: BillingCycle): string {
  const date = new Date(cycle.year, cycle.month - 1, 1);
  return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

/** "5 de octubre" */
export function formatDueDate(date: Date): string {
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

/** "5 oct 2026" — para el historial de pagos. */
export function formatShortDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Convierte lo tecleado en un monto usable; devuelve NaN si no es un número. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^\d.]/g, '');
  if (!cleaned) return NaN;
  return Number(cleaned);
}

/** "oct" — etiqueta corta para el eje de las gráficas. */
export function formatMonthShort(cycle: BillingCycle): string {
  const date = new Date(cycle.year, cycle.month - 1, 1);
  // es-MX abrevia con punto ("oct."); en un eje estorba.
  return date.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
}
