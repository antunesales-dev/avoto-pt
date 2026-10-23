#!/usr/bin/env bash
# Casos-limite da migração 20261023122000 (sobre a cópia de prod + dados sintéticos):
#  A) linha antiga SEM gémeo → não é apagada, fica meta.legacy_sem_gemeo
#  B) gémeo sem investimento + voto no investimento antigo → cria inv-<gémeo>, move voto e contagem
set -euo pipefail
cd "$(dirname "$0")/../.."
export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-55439}" PGUSER="${PGUSER:-postgres}"
DB=avoto_c_edge
q() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
DB=$DB STOP_BEFORE=20261023000000 scripts/db-local/apply-local.sh >/dev/null 2>&1
q -f scripts/db-local/load-prod-copy.sql
q <<'SQL'
-- A) antiga sem gémeo
insert into despesas_publicas (id, titulo, entidade, montante_eur, data_publicacao, source, meta)
values ('base-507606787-2030-01-01-123-sem-gemeo', 'Contrato sem gémeo', 'X,, E.P.E.', 123, '2030-01-01', 'base.gov.pt', '{}');
-- B) escolher um investimento antigo e apagar o investimento do gémeo
create table _caso_b as
select i.id old_inv, i.despesa_id legacy_id from investimentos i
where i.id !~ '^inv-base-[0-9a-f]{28}$' order by i.id limit 1;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 't@example.test') on conflict do nothing;
insert into profiles (id, cid) values ('00000000-0000-0000-0000-0000000000b1', 'CID-TESTB1') on conflict do nothing;
insert into votos_investimentos (user_id, investimento_id, voto_enc)
select '00000000-0000-0000-0000-0000000000b1', old_inv, private.encrypt_text('favor') from _caso_b;
SQL
TWIN=$(q -Atc "select n.id from despesas_publicas n, despesas_publicas l, _caso_b b where l.id=b.legacy_id and n.id ~ '^base-[0-9a-f]{28}\$' and regexp_replace(lower(btrim(n.titulo)),'\s+',' ','g')=regexp_replace(lower(btrim(l.titulo)),'\s+',' ','g') and n.montante_eur=l.montante_eur and n.data_publicacao=l.data_publicacao and n.data_inicio is not distinct from l.data_inicio and n.meta->>'nif_adjudicante'=substring(l.id from '^base-([0-9]{9})-') limit 1")
q -c "delete from investimentos where id = 'inv-$TWIN'"
echo "caso B: antigo=$(q -Atc 'select old_inv from _caso_b') gémeo=$TWIN"
q -1 -f supabase/migrations/20261023122000_despesa_dedup_legacy_entidade_nif.sql 2>&1 | grep -E 'despesa legacy|ERROR' || true
q -c "select
  (select count(*) from despesas_publicas where id='base-507606787-2030-01-01-123-sem-gemeo' and (meta->>'legacy_sem_gemeo')::boolean) a_mantida_e_marcada,
  (select count(*) from despesas_publicas where id !~ '^base-[0-9a-f]{28}\$') antigas_restantes,
  (select count(*) from investimentos where id = (select old_inv from _caso_b)) b_inv_antigo_restante,
  (select count(*) from investimentos where id = 'inv-$TWIN' and despesa_id = '$TWIN') b_inv_gemeo_criado,
  (select count(*) from votos_investimentos where investimento_id = 'inv-$TWIN') b_votos_no_gemeo,
  (select favor from investimento_voto_counts where investimento_id = 'inv-$TWIN') b_favor_no_gemeo"
