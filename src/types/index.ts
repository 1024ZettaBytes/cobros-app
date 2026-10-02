/**
 * Modelos de dominio de CobrosApp.
 * Los comparten la app y el servidor: server/src/mappers.ts importa de aquí.
 */

/** Servicio que revendo (ej. Starlink compartido). */
export interface Service {
  id: string;
  /** Nombre visible, ej. "Starlink Casa". */
  name: string;
  /** Lo que paga cada cliente al mes (MXN). */
  clientPrice: number;
  /** Lo que me cuesta a mí el servicio al mes (MXN). */
  monthlyExpense: number;
  /** Día del mes en que corresponde el cobro (1-31). */
  billingDay: number;
  /** ISO 8601. */
  createdAt: string;
}

/** Cliente asociado a un único servicio. */
export interface Client {
  id: string;
  serviceId: string;
  name: string;
  /** 10 dígitos nacionales de México, sin lada país. El +52 se agrega al abrir WhatsApp. */
  phoneNumber: string;
  /** Un cliente inactivo deja de generar cobros pero conserva su historial. */
  isActive: boolean;
  createdAt: string;
}

/** Pago registrado para un ciclo (mes calendario) concreto. */
export interface PaymentRecord {
  id: string;
  clientId: string;
  /** ISO 8601: cuándo registré el pago. */
  datePaid: string;
  amountPaid: number;
  /** Ciclo que cubre el pago. 1-12. */
  cycleMonth: number;
  cycleYear: number;
  note?: string;
}

/** Preferencias globales de la app. */
export interface AppSettings {
  /** Hora de la notificación diaria en formato "HH:mm" (24h). */
  notificationTime: string;
  /** Plantilla con variables {Nombre} {Servicio} {Monto} {Fecha}. */
  whatsappTemplate: string;
  notificationsEnabled: boolean;
}

/** Estado de cobro calculado al vuelo; nunca se persiste. */
export type PaymentStatus = 'paid' | 'pending' | 'due_soon' | 'overdue';

/** Datos de alta: el id y createdAt los pone el repositorio. */
export type NewService = Omit<Service, 'id' | 'createdAt'>;
export type NewClient = Omit<Client, 'id' | 'createdAt' | 'isActive'> & { isActive?: boolean };
