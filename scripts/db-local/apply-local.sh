#!/usr/bin/env bash
# Recria a BD local de teste e aplica shim + todas as migrações (cada uma numa transação, como o Supabase).
# Uso: PGPORT=55439 DB=avoto_c scripts/db-local/apply-local.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${PGHOST:=127.0.0.1}" "${PGPORT:=55439}" "${PGUSER:=postgres}" "${DB:=avoto_c}"
export PGHOST PGPORT PGUSER
psql -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f scripts/db-local/local-shim.sql 2>/dev/null
for f in supabase/migrations/*.sql; do
  if [[ -n "${STOP_BEFORE:-}" && "$(basename "$f")" > "$STOP_BEFORE" ]]; then echo "stop before $(basename "$f")"; break; fi
  psql -v ON_ERROR_STOP=1 -q -1 -d "$DB" -f "$f" >/dev/null || { echo "FAIL $f"; exit 1; }
done
echo "ok: migrações aplicadas em $DB"
