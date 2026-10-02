# Mis cobros

App web para administrar los cobros mensuales de clientes por reventa de
servicios (Starlink compartido, streaming, lo que sea). Un solo usuario,
protegida con passphrase.

## Qué hace

- **Servicios**: nombre, cobro por cliente, gasto mensual propio y día de corte.
- **Clientes**: uno por servicio, con teléfono mexicano de 10 dígitos.
- **Pagos**: un pago por cliente y ciclo, con historial completo.
- **Estados calculados**: Pagado · Pendiente · Próximo a vencer (< 3 días) ·
  Vencido. Nunca se guardan: se derivan de la fecha y el día de corte.
- **Gráfico de Gasto vs Ganancia** por servicio y totales del mes.
- **Recordatorios por WhatsApp** con plantilla editable y variables.
- **Avisos push** el día del corte, a la hora que elijas.

## Stack

Next.js (App Router) · PostgreSQL · Web Push (VAPID) · Tailwind.

Un solo servicio: la interfaz, la API y el cron viven en el mismo proceso.

```
src/
  app/(app)/     pantallas protegidas — server components, leen Postgres directo
  app/api/       route handlers para las mutaciones del navegador
  lib/           base de datos, sesión, push, cron
  utils/         reglas de negocio puras (ciclos, estados, finanzas)
  components/    interfaz
```

## Desarrollo

```bash
createdb cobros
cp .env.example .env.local        # llena los valores de abajo
npm install
npm run dev
```

Las migraciones corren solas al arrancar (`src/instrumentation.ts`).

**Generar los secretos:**

```bash
openssl rand -base64 48     # SESSION_SECRET
npm run hash-passphrase     # APP_PASSPHRASE_HASH
npm run generate-vapid      # VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY
```

**Probar el cron sin esperar al día del corte:**

```bash
./scripts/test-reminders.sh
```

## Desplegar en Railway

1. **Postgres**: agrega el plugin al proyecto. Expone `DATABASE_URL` solo.
2. **Conecta el repo.** `railway.toml` ya fija build, start y healthcheck.
3. **Variables del servicio** (Settings → Variables):

   | Variable | De dónde sale |
   |---|---|
   | `DATABASE_URL` | referencia al plugin: `${{Postgres.DATABASE_URL}}` |
   | `SESSION_SECRET` | `openssl rand -base64 48` |
   | `APP_PASSPHRASE_HASH` | `npm run hash-passphrase` |
   | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npm run generate-vapid` |
   | `VAPID_SUBJECT` | `mailto:tu-correo@ejemplo.com` |
   | `APP_TIMEZONE` | `America/Mexico_City` |

   `PORT` lo inyecta Railway. `SESSION_DAYS` y `REMINDER_INTERVAL_MINUTES`
   tienen valores por defecto.

4. **Genera el dominio** (Settings → Networking). Railway da HTTPS, que el
   push web exige.

### Dos cosas a vigilar

- **No actives el modo de suspensión del servicio.** El cron de recordatorios
  vive dentro del proceso web; si Railway lo duerme, los avisos no salen.
- **Las claves VAPID son permanentes.** Si las cambias, todos los navegadores
  suscritos dejan de recibir avisos y hay que volver a suscribirlos.

## Instalar en el iPhone

Abre el dominio en Safari → Compartir → **Añadir a pantalla de inicio**.

Las notificaciones web en iOS **solo funcionan con la PWA instalada**; como
pestaña de Safari no llega nada. Una vez instalada, actívalas en Ajustes y usa
**Mandar aviso de prueba** para confirmar antes de confiar en ellas.

## Seguridad

- Todos los endpoints exigen sesión salvo `/api/auth/login` y `/api/health`.
- La passphrase se guarda como hash scrypt; la sesión es una cookie `httpOnly`
  firmada con HMAC, `secure` en producción.
- El login tiene límite de 10 intentos por 5 minutos.
- Los secretos solo viajan por variables de entorno. `.env.local` está en
  `.gitignore`.
