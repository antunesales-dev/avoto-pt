-- Deduplicar despesas/investimentos já gravados com IDs instáveis (slug truncado).
-- Chave natural: título + entidade + montante + data_publicacao.
-- Mantém a linha mais antiga; reapontar investimentos e apagar duplicados.

-- 1) Índice único para source_id estável (sync futuro não cria 2× o mesmo source_id)
create unique index if not exists despesas_publicas_source_source_id_uidx
  on public.despesas_publicas (source, source_id)
  where source_id is not null and source_id <> '';

create unique index if not exists investimentos_id_uidx
  on public.investimentos (id);

-- 2) Mapear duplicados → id canónico
create temporary table if not exists _despesa_dup_map (
  drop_id text primary key,
  keep_id text not null
) on commit drop;

insert into _despesa_dup_map (drop_id, keep_id)
select d.id as drop_id, k.keep_id
from public.despesas_publicas d
join lateral (
  select x.id as keep_id
  from public.despesas_publicas x
  where x.titulo is not distinct from d.titulo
    and x.entidade is not distinct from d.entidade
    and x.montante_eur is not distinct from d.montante_eur
    and x.data_publicacao is not distinct from d.data_publicacao
  order by x.created_at asc nulls last, x.id asc
  limit 1
) k on true
where d.id <> k.keep_id;

-- 3) Investimentos que apontavam para id a apagar → canónico
update public.investimentos i
set despesa_id = m.keep_id,
    updated_at = now()
from _despesa_dup_map m
where i.despesa_id = m.drop_id;

-- 4) Apagar investimentos duplicados (mesmo despesa_id canónico + montante)
delete from public.investimentos inv
using (
  select id,
    row_number() over (
      partition by coalesce(despesa_id, id), montante_eur, data_referencia
      order by created_at asc nulls last, id asc
    ) as rn
  from public.investimentos
) r
where inv.id = r.id and r.rn > 1;

-- 5) Apagar despesas duplicadas (cascata: votos de investimento já reapontados ou apagados)
delete from public.despesas_publicas d
using _despesa_dup_map m
where d.id = m.drop_id;

-- 6) Índice de apoio a queries do digest
create index if not exists despesas_publicas_data_pub_only_idx
  on public.despesas_publicas (data_publicacao)
  where data_publicacao is not null;

create index if not exists investimentos_data_ref_only_idx
  on public.investimentos (data_referencia)
  where data_referencia is not null;
