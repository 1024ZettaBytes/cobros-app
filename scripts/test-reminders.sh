#!/usr/bin/env bash
# Prueba manual del cron de recordatorios contra el servidor en marcha.
#
#   npm run dev            # en otra terminal
#   ./scripts/test-reminders.sh
#
# Ojo: escribe en la base configurada (crea servicios TEST-* y los borra).
set -euo pipefail

API="${API:-http://localhost:3000/api}"
DB="${PGDATABASE:-cobros}"
PASSPHRASE="${PASSPHRASE:-cobros-dev-2026}"
JAR=$(mktemp)

curl -s -c "$JAR" -o /dev/null -X POST "$API/auth/login" \
  -H 'content-type: application/json' -d "{\"passphrase\":\"$PASSPHRASE\"}"

run() { curl -s -b "$JAR" -X POST "$API/reminders/run" | node -pe "JSON.parse(require('fs').readFileSync(0)).sent"; }
sql() { psql "$DB" -t -A -c "$1"; }
# psql imprime el tag del comando después del RETURNING; nos quedamos con el valor.
sql1() { sql "$1" | head -1; }

limpiar() {
  sql "delete from services where name like 'TEST-%'" > /dev/null
  sql "update settings set notifications_enabled = true, notification_time = '09:00'" > /dev/null
}

TZ_APP=$(grep '^APP_TIMEZONE=' .env.local | cut -d= -f2 || echo America/Mexico_City)
HOY=$(TZ="$TZ_APP" date +%-d)
OTRO=$([ "$HOY" -eq 15 ] && echo 16 || echo 15)
echo "Hoy en $TZ_APP es día $HOY (el otro servicio corta el $OTRO)"
echo

limpiar
for dia_nombre in "$HOY:TEST-corta-hoy" "$OTRO:TEST-corta-otro-dia"; do
  dia="${dia_nombre%%:*}"; nombre="${dia_nombre##*:}"
  id=$(sql1 "insert into services (name, client_price, monthly_expense, billing_day)
            values ('$nombre', 350, 1100, $dia) returning id")
  sql "insert into clients (service_id, name, phone_number)
       values ('$id', 'Cliente Activo', '6641234567')" > /dev/null
done

sql "update settings set notifications_enabled = true, notification_time = '23:59'" > /dev/null
echo "hora del aviso 23:59 (aún no llega) -> $(run) avisos  [esperado: 0]"

sql "update settings set notification_time = '00:01'" > /dev/null
echo "hora del aviso 00:01 (ya pasó)      -> $(run) avisos  [esperado: 1]"
echo "   registros del que corta hoy:      $(sql "select count(*) from sent_reminders r join services s on s.id = r.service_id where s.name = 'TEST-corta-hoy'")  [esperado: 1]"
echo "   registros del de otro día:        $(sql "select count(*) from sent_reminders r join services s on s.id = r.service_id where s.name = 'TEST-corta-otro-dia'")  [esperado: 0]"

echo "segunda corrida del mismo tick      -> $(run) avisos  [esperado: 0]"

sql "update settings set notifications_enabled = false" > /dev/null
sql "delete from sent_reminders" > /dev/null
echo "con recordatorios apagados          -> $(run) avisos  [esperado: 0]"

limpiar
rm -f "$JAR"
echo
echo "(datos de prueba borrados)"
