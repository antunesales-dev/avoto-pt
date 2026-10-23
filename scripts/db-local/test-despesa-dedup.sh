#!/usr/bin/env bash
# Prova local da migração 20261023122000 sobre uma cópia dos dados de produção.
# Pré-requisitos: Postgres local (PGHOST/PGPORT), /workspace/avoto-C-data/{despesas,investimentos}.json
set -euo pipefail
cd "$(dirname "$0")/../.."
export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-55439}" PGUSER="${PGUSER:-postgres}"
DB=avoto_c_dedup
MIG=supabase/migrations/20261023122000_despesa_dedup_legacy_entidade_nif.sql
q() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }

DB=$DB STOP_BEFORE=20261023000000 scripts/db-local/apply-local.sh >/dev/null 2>&1
q -f scripts/db-local/load-prod-copy.sql

echo "== ANTES"
q -c "create table _before as select * from despesas_publicas; create table _inv_before as select * from investimentos; create table _votos_before as select * from votos_investimentos;"
q -c "select count(*) total,
  count(*) filter (where id ~ '^base-[0-9a-f]{28}\$') hash,
  count(*) filter (where id !~ '^base-[0-9a-f]{28}\$') legacy,
  count(distinct entidade) entidades_nome,
  (select count(*) from investimentos) investimentos,
  count(*) filter (where montante_eur >= 100000) ge_100k
from despesas_publicas"

echo "== MIGRAÇÃO"
q -1 -f "$MIG" 2>&1 | grep -E 'NOTICE|ERROR' || true

echo "== DEPOIS"
q -c "select count(*) total,
  count(*) filter (where id ~ '^base-[0-9a-f]{28}\$') hash,
  count(*) filter (where id !~ '^base-[0-9a-f]{28}\$') legacy,
  count(*) filter (where (meta->>'legacy_sem_gemeo')::boolean) legacy_sem_gemeo,
  count(distinct entidade) entidades_nome,
  count(distinct entidade_nif) entidades_nif,
  count(*) filter (where entidade_nif is null) sem_nif,
  (select count(*) from investimentos) investimentos,
  count(*) filter (where montante_eur >= 100000) ge_100k,
  (select investimentos from metricas_globais) metrica_contratos_100k
from despesas_publicas"

echo "== VERIFICAÇÕES (todas devem dar 0)"
q -c "select
  -- linhas hash: nenhuma perdida, nenhum campo de contrato alterado
  (select count(*) from _before b where b.id ~ '^base-[0-9a-f]{28}\$'
     and not exists (select 1 from despesas_publicas d where d.id = b.id
       and d.titulo = b.titulo and d.montante_eur is not distinct from b.montante_eur
       and d.data_publicacao is not distinct from b.data_publicacao
       and d.data_inicio is not distinct from b.data_inicio
       and d.descricao = b.descricao and d.links = b.links
       and d.meta - 'entidade_fonte' = b.meta)) hash_perdidas_ou_alteradas,
  -- cada linha antiga apagada tem gémeo presente
  (select count(*) from _before b where b.id !~ '^base-[0-9a-f]{28}\$'
     and not exists (select 1 from despesas_publicas d where d.id = b.id)
     and not exists (select 1 from despesas_publicas d where d.id ~ '^base-[0-9a-f]{28}\$'
       and d.entidade_nif = substring(b.id from '^base-([0-9]{9})-')
       and despesa_titulo_key(d.titulo) = despesa_titulo_key(b.titulo)
       and d.montante_eur = b.montante_eur and d.data_publicacao = b.data_publicacao
       and d.data_inicio is not distinct from b.data_inicio)) antigas_apagadas_sem_gemeo,
  -- entidade original guardada quando mudou
  (select count(*) from despesas_publicas d join _before b using (id)
     where d.entidade <> b.entidade and d.meta->>'entidade_fonte' is distinct from b.entidade) nome_original_perdido,
  -- investimentos: todos espelham uma despesa existente com id inv-<despesa_id>
  (select count(*) from investimentos i where i.despesa_id is null or i.id <> 'inv-' || i.despesa_id
     or not exists (select 1 from despesas_publicas d where d.id = i.despesa_id)) inv_orfaos,
  -- todas as despesas >= 100k continuam a ter investimento (nada perdido)
  (select count(*) from despesas_publicas d where d.montante_eur >= 100000
     and not exists (select 1 from investimentos i where i.despesa_id = d.id)) ge100k_sem_inv,
  -- votos em investimentos: nenhum perdido
  (select count(*) from _votos_before vb where not exists (select 1 from votos_investimentos v where v.id = vb.id)) votos_perdidos"

echo "== ENTIDADES: nomes da fonte → nome canónico (top 8 NIF)"
q -c "select nif, nome_canonico, n_contratos, cardinality(nomes_fonte) variantes from despesa_entidades order by n_contratos desc limit 8"

echo "== IDEMPOTÊNCIA (2.ª execução)"
q -c "create table _after1 as select * from despesas_publicas"
q -1 -f "$MIG" 2>&1 | grep -E 'NOTICE|ERROR' || true
q -c "select (select count(*) from despesas_publicas) total,
  (select count(*) from ((select id, titulo, entidade, meta from despesas_publicas) except (select id, titulo, entidade, meta from _after1)) x) linhas_diferentes"

echo "== GUARDAS do sync"
{ q -c "select upsert_despesa_publica('{\"id\":\"base-510103448-2026-04-27-325630-25-x\",\"source\":\"base.gov.pt\",\"titulo\":\"x\"}')" 2>&1 || true; } | grep -o 'LEGACY_DESPESA_ID[^(]*' || echo "FALHOU: id antigo aceite"
{ q -c "insert into despesas_publicas (id, titulo, source) values ('base-506361462-2099-01-01-1-x', 'x', 'base.gov.pt')" 2>&1 || true; } | grep -o 'despesas_base_id_hash_chk' || echo "FALHOU: check não bloqueou"
q -Atc "select upsert_despesa_publica('{\"id\":\"base-0000000000000000000000000abc\",\"source\":\"base.gov.pt\",\"titulo\":\"Teste\",\"entidade\":\"Unidade Local de Saúde da Arrábida,, E.P.E.\",\"meta\":{\"nif_adjudicante\":\"507606787\"}}')"
q -Atc "select 'entidade gravada: ' || entidade || ' | fonte: ' || (meta->>'entidade_fonte') from despesas_publicas where id='base-0000000000000000000000000abc'"
{ q -c "select upsert_investimento('{\"id\":\"inv-base-0000000000000000000000000xyz\",\"source\":\"base.gov.pt\",\"despesa_id\":\"base-0000000000000000000000000abc\",\"titulo\":\"x\"}')" 2>&1 || true; } | grep -o 'INVESTIMENTO_SEM_DESPESA' || echo "FALHOU: inv sem espelho aceite"
q -Atc "select 'inv ok: ' || upsert_investimento('{\"id\":\"inv-base-0000000000000000000000000abc\",\"source\":\"base.gov.pt\",\"despesa_id\":\"base-0000000000000000000000000abc\",\"titulo\":\"x\"}')"
