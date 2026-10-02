import type { NewClient, NewService } from '@/types';

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

/** 10 dígitos nacionales (México). Acepta espacios, guiones y paréntesis al capturar. */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '').replace(/^52/, '').slice(-10);
}

export function validateService(input: Partial<NewService>): ValidationErrors<NewService> {
  const errors: ValidationErrors<NewService> = {};

  if (!input.name?.trim()) errors.name = 'Ponle un nombre al servicio.';

  if (input.clientPrice === undefined || Number.isNaN(input.clientPrice) || input.clientPrice <= 0) {
    errors.clientPrice = 'El cobro al cliente debe ser mayor a 0.';
  }

  if (
    input.monthlyExpense === undefined ||
    Number.isNaN(input.monthlyExpense) ||
    input.monthlyExpense < 0
  ) {
    errors.monthlyExpense = 'El gasto mensual no puede ser negativo.';
  }

  if (
    input.billingDay === undefined ||
    !Number.isInteger(input.billingDay) ||
    input.billingDay < 1 ||
    input.billingDay > 31
  ) {
    errors.billingDay = 'El día de corte debe estar entre 1 y 31.';
  }

  return errors;
}

export function validateClient(input: Partial<NewClient>): ValidationErrors<NewClient> {
  const errors: ValidationErrors<NewClient> = {};

  if (!input.name?.trim()) errors.name = 'Ponle un nombre al cliente.';
  if (!input.serviceId) errors.serviceId = 'Selecciona un servicio.';

  const phone = normalizePhone(input.phoneNumber ?? '');
  if (phone.length !== 10) errors.phoneNumber = 'El teléfono debe tener 10 dígitos.';

  return errors;
}

export function hasErrors<T>(errors: ValidationErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}
