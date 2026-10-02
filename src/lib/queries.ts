import 'server-only';

import { query, queryOne } from '@/lib/db/pool';
import {
  type ClientRow,
  type PaymentRow,
  type ServiceRow,
  type SettingsRow,
  toClient,
  toPayment,
  toService,
  toSettings,
} from '@/lib/mappers';
import type { AppSettings, Client, PaymentRecord, Service } from '@/types';
import { type BillingCycle, getCycleForDate } from '@/utils/cycle';
import {
  computeGlobalFinance,
  computeServiceFinance,
  type GlobalFinance,
  type ServiceFinance,
} from '@/utils/finance';
import { type ClientStatus, computeClientStatus, STATUS_PRIORITY } from '@/utils/status';

/**
 * Lectura de datos para los server components.
 *
 * Estos corren en el servidor, así que van directo a Postgres: no tiene
 * sentido que el servidor se haga una petición HTTP a sí mismo. Las rutas de
 * /api siguen existiendo para las mutaciones desde el navegador.
 */

const SERVICE_COLUMNS =
  'id, name, client_price, monthly_expense, billing_day, created_at';
const CLIENT_COLUMNS = 'id, service_id, name, phone_number, is_active, created_at';
const PAYMENT_COLUMNS =
  'id, client_id, date_paid, amount_paid, cycle_month, cycle_year, note';

export interface ServiceSummary {
  service: Service;
  clients: Client[];
  finance: ServiceFinance;
}

export interface DashboardData {
  cycle: BillingCycle;
  summaries: ServiceSummary[];
  totals: GlobalFinance;
}

export async function getDashboard(): Promise<DashboardData> {
  const cycle = getCycleForDate();

  const [services, clients, payments] = await Promise.all([
    query<ServiceRow>(`select ${SERVICE_COLUMNS} from services order by name`),
    query<ClientRow>(`select ${CLIENT_COLUMNS} from clients order by name`),
    query<PaymentRow>(
      `select ${PAYMENT_COLUMNS} from payments where cycle_month = $1 and cycle_year = $2`,
      [cycle.month, cycle.year],
    ),
  ]);

  const allClients = clients.map(toClient);
  const cyclePayments = payments.map(toPayment);

  const summaries = services.map(toService).map((service) => {
    const serviceClients = allClients.filter((client) => client.serviceId === service.id);
    return {
      service,
      clients: serviceClients,
      finance: computeServiceFinance(service, serviceClients, cyclePayments),
    };
  });

  return {
    cycle,
    summaries,
    totals: computeGlobalFinance(summaries.map((summary) => summary.finance)),
  };
}

export interface ClientSummary {
  client: Client;
  status: ClientStatus;
}

export interface ServiceDetail {
  service: Service;
  clients: ClientSummary[];
  finance: ServiceFinance;
  cycle: BillingCycle;
}

export async function getServiceDetail(id: string): Promise<ServiceDetail | null> {
  const cycle = getCycleForDate();

  const row = await queryOne<ServiceRow>(
    `select ${SERVICE_COLUMNS} from services where id = $1`,
    [id],
  );
  if (!row) return null;

  const service = toService(row);

  const [clientRows, paymentRows] = await Promise.all([
    query<ClientRow>(`select ${CLIENT_COLUMNS} from clients where service_id = $1 order by name`, [
      id,
    ]),
    query<PaymentRow>(
      `select ${PAYMENT_COLUMNS} from payments where cycle_month = $1 and cycle_year = $2`,
      [cycle.month, cycle.year],
    ),
  ]);

  const clients = clientRows.map(toClient);
  const cyclePayments = paymentRows.map(toPayment);
  const paymentByClient = new Map(cyclePayments.map((payment) => [payment.clientId, payment]));

  const summaries = clients
    .map((client) => ({
      client,
      status: computeClientStatus(service, cycle, paymentByClient.get(client.id) ?? null),
    }))
    // Primero lo vencido, al final lo ya pagado; los inactivos hasta abajo.
    .sort((a, b) => {
      if (a.client.isActive !== b.client.isActive) return a.client.isActive ? -1 : 1;
      const byStatus = STATUS_PRIORITY[a.status.status] - STATUS_PRIORITY[b.status.status];
      return byStatus !== 0 ? byStatus : a.client.name.localeCompare(b.client.name, 'es');
    });

  return {
    service,
    clients: summaries,
    finance: computeServiceFinance(service, clients, cyclePayments),
    cycle,
  };
}

export interface ClientDetail {
  client: Client;
  service: Service;
  status: ClientStatus;
  /** Historial completo, del pago más reciente al más antiguo. */
  history: PaymentRecord[];
  cycle: BillingCycle;
}

export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  const cycle = getCycleForDate();

  const clientRow = await queryOne<ClientRow>(
    `select ${CLIENT_COLUMNS} from clients where id = $1`,
    [id],
  );
  if (!clientRow) return null;

  const client = toClient(clientRow);

  const [serviceRow, paymentRows] = await Promise.all([
    queryOne<ServiceRow>(`select ${SERVICE_COLUMNS} from services where id = $1`, [
      client.serviceId,
    ]),
    query<PaymentRow>(
      `select ${PAYMENT_COLUMNS} from payments where client_id = $1 order by date_paid desc`,
      [id],
    ),
  ]);

  // La llave foránea garantiza que el servicio exista.
  if (!serviceRow) return null;

  const service = toService(serviceRow);
  const history = paymentRows.map(toPayment);
  const cyclePayment =
    history.find(
      (payment) => payment.cycleMonth === cycle.month && payment.cycleYear === cycle.year,
    ) ?? null;

  return {
    client,
    service,
    status: computeClientStatus(service, cycle, cyclePayment),
    history,
    cycle,
  };
}

export async function getSettings(): Promise<AppSettings> {
  const row = await queryOne<SettingsRow>(
    'select notification_time, whatsapp_template, notifications_enabled from settings where id = true',
  );
  return toSettings(row!);
}
