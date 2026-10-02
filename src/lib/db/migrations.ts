/**
 * Migraciones como módulo TypeScript, no como archivos .sql sueltos.
 *
 * El rastreo de archivos de Next no incluye archivos leídos con fs en tiempo
 * de ejecución, así que un .sql suelto no llegaría al build de producción.
 * Embebido aquí, siempre viaja con el bundle.
 *
 * Para agregar una migración: añade una entrada al final del arreglo. Nunca
 * edites una ya aplicada — el runner las registra por nombre.
 */

export interface Migration {
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    name: '001_init',
    sql: `-- Esquema inicial de CobrosApp.
-- El dinero se guarda como numeric(10,2): nunca float, que redondea mal.

create table services (
  id                text primary key default gen_random_uuid()::text,
  name              text not null check (length(trim(name)) > 0),
  client_price      numeric(10, 2) not null check (client_price > 0),
  monthly_expense   numeric(10, 2) not null check (monthly_expense >= 0),
  billing_day       smallint not null check (billing_day between 1 and 31),
  created_at        timestamptz not null default now()
);

create table clients (
  id            text primary key default gen_random_uuid()::text,
  service_id    text not null references services (id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  -- 10 dígitos nacionales; el +52 lo pone el cliente al abrir WhatsApp.
  phone_number  text not null check (phone_number ~ '^[0-9]{10}$'),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index clients_service_id_idx on clients (service_id);

create table payments (
  id           text primary key default gen_random_uuid()::text,
  client_id    text not null references clients (id) on delete cascade,
  date_paid    timestamptz not null default now(),
  amount_paid  numeric(10, 2) not null check (amount_paid > 0),
  cycle_month  smallint not null check (cycle_month between 1 and 12),
  cycle_year   smallint not null check (cycle_year between 2000 and 2100),
  note         text,

  -- La regla "un pago por ciclo" vive aquí, no solo en el código.
  unique (client_id, cycle_month, cycle_year)
);

create index payments_cycle_idx on payments (cycle_year, cycle_month);

-- Ajustes globales: una sola fila, garantizado por el check sobre la PK.
create table settings (
  id                    boolean primary key default true check (id),
  notification_time     text not null default '09:00' check (notification_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  whatsapp_template     text not null,
  notifications_enabled boolean not null default true,
  updated_at            timestamptz not null default now()
);

insert into settings (id, whatsapp_template) values (
  true,
  E'Hola {Nombre} \\U0001F44B\\n\\nTe recuerdo el pago de *{Servicio}* por *{Monto}*, con fecha de corte el {Fecha}.\\n\\n¡Gracias!'
);

-- Navegadores suscritos a Web Push.
create table push_subscriptions (
  id            text primary key default gen_random_uuid()::text,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- Evita mandar dos veces el aviso del mismo corte si el cron corre de más.
create table sent_reminders (
  service_id   text not null references services (id) on delete cascade,
  cycle_month  smallint not null,
  cycle_year   smallint not null,
  sent_at      timestamptz not null default now(),

  primary key (service_id, cycle_month, cycle_year)
);
`,
  },
];
