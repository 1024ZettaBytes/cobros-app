import type { AppSettings, Client, PaymentRecord, Service } from '@/types';

/**
 * Traducción entre las filas de Postgres (snake_case) y los tipos de dominio
 * que comparte la app (camelCase). Un solo lugar donde vive la conversión.
 */

export interface ServiceRow {
  id: string;
  name: string;
  client_price: number;
  monthly_expense: number;
  billing_day: number;
  created_at: Date;
}

export function toService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    clientPrice: row.client_price,
    monthlyExpense: row.monthly_expense,
    billingDay: row.billing_day,
    createdAt: row.created_at.toISOString(),
  };
}

export interface ClientRow {
  id: string;
  service_id: string;
  name: string;
  phone_number: string;
  is_active: boolean;
  created_at: Date;
}

export function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    serviceId: row.service_id,
    name: row.name,
    phoneNumber: row.phone_number,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
  };
}

export interface PaymentRow {
  id: string;
  client_id: string;
  date_paid: Date;
  amount_paid: number;
  cycle_month: number;
  cycle_year: number;
  note: string | null;
}

export function toPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    datePaid: row.date_paid.toISOString(),
    amountPaid: row.amount_paid,
    cycleMonth: row.cycle_month,
    cycleYear: row.cycle_year,
    note: row.note ?? undefined,
  };
}

export interface SettingsRow {
  notification_time: string;
  whatsapp_template: string;
  notifications_enabled: boolean;
}

export function toSettings(row: SettingsRow): AppSettings {
  return {
    notificationTime: row.notification_time,
    whatsappTemplate: row.whatsapp_template,
    notificationsEnabled: row.notifications_enabled,
  };
}
