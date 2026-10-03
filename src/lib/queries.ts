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
import { type BillingCycle, fromOrdinal, getCycleForDate, toOrdinal } from '@/utils/cycle';
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

export interface MonthlyPoint {
  cycle: BillingCycle;
  /** Dinero efectivamente recibido en ese ciclo. */
  collected: number;
  /** Gasto que regía en ese ciclo, según el historial. */
  expense: number;
  profit: number;
}

/**
 * Serie de los últimos meses para la gráfica de ganancias.
 *
 * El gasto sale de service_expenses, que guarda desde qué ciclo rige cada
 * valor: cambiar hoy el precio de un servicio ya no reescribe el pasado. Un
 * servicio sin ninguna fila vigente todavía no existía ese mes y aporta cero.
 *
 * Lo cobrado suma todos los pagos del ciclo, incluidos los de clientes que
 * después diste de baja. Es dinero que sí entró.
 */
export async function getProfitTrend(months = 6): Promise<MonthlyPoint[]> {
  const lastOrdinal = toOrdinal(getCycleForDate());
  const firstOrdinal = lastOrdinal - (months - 1);

  const [paymentRows, expenseRows] = await Promise.all([
    query<{ cycle_month: number; cycle_year: number; collected: number }>(
      `select cycle_month, cycle_year, sum(amount_paid) as collected
         from payments
        where cycle_year * 12 + cycle_month between $1 and $2
        group by cycle_year, cycle_month`,
      [firstOrdinal, lastOrdinal],
    ),
    // Sin filtrar por firstOrdinal: el gasto de mayo puede venir de una fila
    // registrada en enero, que es la última que entró en vigor.
    query<{ service_id: string; cycle_month: number; cycle_year: number; monthly_expense: number }>(
      `select service_id, cycle_month, cycle_year, monthly_expense
         from service_expenses
        where cycle_year * 12 + cycle_month <= $1
        order by cycle_year, cycle_month`,
      [lastOrdinal],
    ),
  ]);

  const collectedByOrdinal = new Map(
    paymentRows.map((row) => [row.cycle_year * 12 + row.cycle_month, row.collected]),
  );

  const historyByService = new Map<string, { ordinal: number; expense: number }[]>();
  for (const row of expenseRows) {
    const history = historyByService.get(row.service_id) ?? [];
    history.push({
      ordinal: row.cycle_year * 12 + row.cycle_month,
      expense: row.monthly_expense,
    });
    historyByService.set(row.service_id, history);
  }

  /** Gasto total vigente en un ciclo, sumando todos los servicios. */
  const expenseAt = (ordinal: number) => {
    let total = 0;

    for (const history of historyByService.values()) {
      // Las filas vienen ordenadas; manda el último valor que ya entró en
      // vigor. Si ninguno lo hizo, el servicio aún no existía y suma cero.
      let current = 0;
      for (const entry of history) {
        if (entry.ordinal > ordinal) break;
        current = entry.expense;
      }
      total += current;
    }

    return total;
  };

  const points: MonthlyPoint[] = [];

  for (let ordinal = firstOrdinal; ordinal <= lastOrdinal; ordinal += 1) {
    const collected = collectedByOrdinal.get(ordinal) ?? 0;
    const expense = expenseAt(ordinal);
    points.push({ cycle: fromOrdinal(ordinal), collected, expense, profit: collected - expense });
  }

  return points;
}
