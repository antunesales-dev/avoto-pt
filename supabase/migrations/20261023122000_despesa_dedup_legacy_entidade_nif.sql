-- =============================================================================
-- Despesa: remover linhas com id antigo (slug) que têm gémeo com id hash,
-- normalizar a entidade adjudicante pelo NIF e impedir que ids antigos voltem.
--
-- Contexto (prod, 23 out 2026): 1198 despesas, 379 com id antigo
-- (`base-<nif>-<data>-<preço>-<slug>`, último sync a 4 ago). O sync atual grava
-- `base-<sha256[0:28]>` (ver supabase/functions/_shared/despesa.ts). 158 dos 501
-- investimentos apontam para despesas com id antigo.
--
-- Regras:
--  * Uma linha antiga só é apagada se existir um gémeo com id hash:
--    mesmo NIF adjudicante (vem no id antigo), título (minúsculas, espaços
--    colapsados), montante, data de publicação e data de celebração.
--  * Linhas antigas SEM gémeo não são apagadas: ficam marcadas
--    meta.legacy_sem_gemeo = true para revisão manual.
--  * Investimentos da linha antiga: se o gémeo já tem investimento, os votos
--    passam para esse (sem duplicar o voto de quem já votou nos dois) e o
--    antigo é apagado; se o gémeo ainda não tem investimento, é criado
--    inv-<id do gémeo> a partir do antigo (mesma regra do sync).
--  * Entidade: nome canónico por NIF (tabela despesa_entidades), nome original
--    guardado em meta.entidade_fonte.
-- Idempotente: correr 2× não muda nada na segunda.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Helpers
-- ---------------------------------------------------------------------------
create or replace function public.despesa_titulo_key(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(lower(btrim(coalesce(p, ''))), '\s+', ' ', 'g')
$$;

-- Limpa formatação do nome (",, E.P.E.", "E. P. E.", "EPE", "E.P.E..") sem mudar a entidade.
create or replace function public.despesa_entidade_limpa(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select btrim(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
      regexp_replace(coalesce(p, ''), '\s+', ' ', 'g'),
      '\s*,(\s*,)+\s*', ', ', 'g'),                                  -- ",," → ","
      '\s*,?\s*\mE\.?\s?P\.?\s?E\M(?![.\s]?R\M)\.*', ', E.P.E.', 'gi'),  -- E. P. E. / EPE / E.P.E..
      '\s*,?\s*\mE\.?\s?P\.?\s?E\.?\s?R\M\.*', ', E.P.E.R.', 'gi'),           -- E.P.E.R. (Açores)
      '\s*,?\s*\mI\.\s?P\.(\s|$)', ', I.P.\1', 'g'),                  -- I. P. → I.P.
      '\s+,', ',', 'g'),
      '\s{2,}', ' ', 'g')
  )
$$;

grant execute on function public.despesa_titulo_key(text) to anon, authenticated, service_role;
grant execute on function public.despesa_entidade_limpa(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1) Entidades por NIF
-- ---------------------------------------------------------------------------
create table if not exists public.despesa_entidades (
  nif text primary key,
  nome_canonico text not null,
  nomes_fonte text[] not null default '{}',
  n_contratos integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.despesa_entidades is
  'Nome canónico da entidade adjudicante por NIF (Portal Base). O nome da fonte varia (renomeações ULS 2024, ",, E.P.E.").';

alter table public.despesa_entidades enable row level security;
drop policy if exists despesa_entidades_select_all on public.despesa_entidades;
create policy despesa_entidades_select_all
  on public.despesa_entidades for select to anon, authenticated using (true);
grant select on public.despesa_entidades to anon, authenticated;
grant all on public.despesa_entidades to service_role;

alter table public.despesas_publicas
  add column if not exists entidade_nif text null;

create index if not exists despesas_publicas_entidade_nif_idx
  on public.despesas_publicas (entidade_nif);

-- NIF: novo formato tem meta.nif_adjudicante; o antigo tem-no no id.
update public.despesas_publicas d
set entidade_nif = coalesce(
  nullif(d.meta ->> 'nif_adjudicante', ''),
  substring(d.id from '^base-([0-9]{9})-')
)
where d.entidade_nif is null
  and coalesce(nullif(d.meta ->> 'nif_adjudicante', ''), substring(d.id from '^base-([0-9]{9})-')) is not null;

-- ---------------------------------------------------------------------------
-- 2) Mapa id antigo → gémeo hash
-- ---------------------------------------------------------------------------
create temporary table _despesa_legacy on commit drop as
select d.*
from public.despesas_publicas d
where d.source = 'base.gov.pt'
  and d.id !~ '^base-[0-9a-f]{28}$';

create temporary table _despesa_legacy_map on commit drop as
select l.id as legacy_id, t.twin_id
from _despesa_legacy l
join lateral (
  select n.id as twin_id
  from public.despesas_publicas n
  where n.id ~ '^base-[0-9a-f]{28}$'
    and n.entidade_nif is not distinct from l.entidade_nif
    and public.despesa_titulo_key(n.titulo) = public.despesa_titulo_key(l.titulo)
    and n.montante_eur is not distinct from l.montante_eur
    and n.data_publicacao is not distinct from l.data_publicacao
    and n.data_inicio is not distinct from l.data_inicio
  order by
    -- mesma adjudicatária primeiro (há contratos com 2 linhas na fonte que só diferem na ordem)
    (coalesce(n.meta ->> 'adjudicataria', '') = coalesce(l.meta ->> 'adjudicataria', '')) desc,
    n.created_at asc nulls last,
    n.id asc
  limit 1
) t on true;

do $$
declare
  n_legacy int; n_map int;
begin
  select count(*) into n_legacy from _despesa_legacy;
  select count(*) into n_map from _despesa_legacy_map;
  raise notice 'despesa legacy: % linhas, % com gémeo hash, % sem gémeo (ficam marcadas)',
    n_legacy, n_map, n_legacy - n_map;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Investimentos das linhas antigas → investimento do gémeo (inv-<twin_id>)
-- ---------------------------------------------------------------------------
create temporary table _inv_map on commit drop as
select i.id as old_inv, m.twin_id, 'inv-' || m.twin_id as twin_inv
from public.investimentos i
join _despesa_legacy_map m on m.legacy_id = i.despesa_id;

-- 3a) Gémeo ainda sem investimento: criar inv-<twin_id> a partir do antigo.
insert into public.investimentos (
  id, titulo, descricao, montante_eur, entidade, sector, data_referencia,
  decisao_oficial, decisao_detalhe, despesa_id, links, source, last_synced_at, created_at, updated_at
)
select m.twin_inv, i.titulo, i.descricao, i.montante_eur, i.entidade, i.sector, i.data_referencia,
       i.decisao_oficial, i.decisao_detalhe, m.twin_id, i.links, i.source, i.last_synced_at, i.created_at, now()
from public.investimentos i
join _inv_map m on m.old_inv = i.id
on conflict (id) do nothing;

insert into public.investimento_voto_counts (investimento_id)
select twin_inv from _inv_map
on conflict (investimento_id) do nothing;

-- 3b) Votos: se alguém votou no antigo E no gémeo não dá para fundir as contagens
-- sem decifrar o voto → abortar (em prod, 23 out 2026: 0 votos em investimentos).
do $$
begin
  if exists (
    select 1
    from public.votos_investimentos v
    join _inv_map m on m.old_inv = v.investimento_id
    join public.votos_investimentos t on t.investimento_id = m.twin_inv and t.user_id = v.user_id
  ) then
    raise exception 'ABORT: há utilizadores com voto no investimento antigo e no gémeo; fundir à mão';
  end if;
end $$;

update public.votos_investimentos v
set investimento_id = m.twin_inv
from _inv_map m
where v.investimento_id = m.old_inv;

update public.investimento_voto_counts c
set favor = c.favor + o.favor,
    contra = c.contra + o.contra,
    abstencao = c.abstencao + o.abstencao,
    updated_at = now()
from (
  select m.twin_inv, sum(oc.favor) favor, sum(oc.contra) contra, sum(oc.abstencao) abstencao
  from _inv_map m
  join public.investimento_voto_counts oc on oc.investimento_id = m.old_inv
  where (oc.favor + oc.contra + oc.abstencao) > 0
  group by m.twin_inv
) o
where c.investimento_id = o.twin_inv;

delete from public.investimentos i
using _inv_map m
where i.id = m.old_inv;

-- ---------------------------------------------------------------------------
-- 4) Apagar despesas antigas com gémeo; marcar as sem gémeo
-- ---------------------------------------------------------------------------
delete from public.despesas_publicas d
using _despesa_legacy_map m
where d.id = m.legacy_id;

update public.despesas_publicas d
set meta = d.meta || jsonb_build_object('legacy_sem_gemeo', true),
    updated_at = now()
from _despesa_legacy l
where d.id = l.id
  and not coalesce((d.meta ->> 'legacy_sem_gemeo')::boolean, false);

-- ---------------------------------------------------------------------------
-- 5) Nome canónico por NIF
-- ---------------------------------------------------------------------------
-- Canónico = nome limpo mais frequente desde 2024 (reforma ULS); senão, de sempre.
insert into public.despesa_entidades (nif, nome_canonico, nomes_fonte, n_contratos, updated_at)
select s.nif, s.nome, s.nomes, s.n, now()
from (
  select
    d.entidade_nif as nif,
    (
      select public.despesa_entidade_limpa(x.entidade)
      from public.despesas_publicas x
      where x.entidade_nif = d.entidade_nif and btrim(x.entidade) <> ''
      group by public.despesa_entidade_limpa(x.entidade)
      order by count(*) filter (where x.data_publicacao >= date '2024-01-01') desc,
               count(*) desc,
               max(x.data_publicacao) desc nulls last,
               1
      limit 1
    ) as nome,
    array_agg(distinct coalesce(d.meta ->> 'entidade_fonte', d.entidade)) as nomes,
    count(*)::int as n
  from public.despesas_publicas d
  where d.entidade_nif is not null
  group by d.entidade_nif
) s
where s.nome is not null
on conflict (nif) do update set
  nome_canonico = excluded.nome_canonico,
  nomes_fonte = (
    select array_agg(distinct x) from unnest(public.despesa_entidades.nomes_fonte || excluded.nomes_fonte) x
  ),
  n_contratos = excluded.n_contratos,
  updated_at = now();

update public.despesas_publicas d
set meta = case when d.meta ? 'entidade_fonte' then d.meta
                else d.meta || jsonb_build_object('entidade_fonte', d.entidade) end,
    entidade = e.nome_canonico,
    updated_at = now()
from public.despesa_entidades e
where e.nif = d.entidade_nif
  and d.entidade is distinct from e.nome_canonico;

update public.investimentos i
set entidade = d.entidade, updated_at = now()
from public.despesas_publicas d
where d.id = i.despesa_id
  and i.entidade is distinct from d.entidade;

-- ---------------------------------------------------------------------------
-- 6) Garantir que ids antigos não voltam
-- ---------------------------------------------------------------------------
alter table public.despesas_publicas
  drop constraint if exists despesas_base_id_hash_chk;
alter table public.despesas_publicas
  add constraint despesas_base_id_hash_chk
  check (
    source <> 'base.gov.pt'
    or id ~ '^base-[0-9a-f]{28}$'
    or coalesce((meta ->> 'legacy_sem_gemeo')::boolean, false)
  );

create or replace function public.upsert_despesa_publica(p jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_source text;
  v_nif text;
  v_entidade_fonte text;
  v_entidade text;
  v_meta jsonb;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_id := p ->> 'id';
  if v_id is null or v_id = '' then
    raise exception 'ID_REQUIRED';
  end if;

  v_source := coalesce(p ->> 'source', 'oficial');
  if v_source = 'base.gov.pt' and v_id !~ '^base-[0-9a-f]{28}$' then
    raise exception 'LEGACY_DESPESA_ID: % (esperado base-<sha256 28 hex>)', v_id
      using errcode = '22023';
  end if;

  v_meta := coalesce(p -> 'meta', '{}'::jsonb);
  v_nif := nullif(coalesce(p ->> 'entidade_nif', v_meta ->> 'nif_adjudicante'), '');
  v_entidade_fonte := coalesce(p ->> 'entidade', '');
  v_entidade := v_entidade_fonte;

  if v_nif is not null then
    insert into public.despesa_entidades (nif, nome_canonico, nomes_fonte, n_contratos)
    values (v_nif, public.despesa_entidade_limpa(v_entidade_fonte), array[v_entidade_fonte], 0)
    on conflict (nif) do update set
      nomes_fonte = case
        when v_entidade_fonte = any (public.despesa_entidades.nomes_fonte) then public.despesa_entidades.nomes_fonte
        else public.despesa_entidades.nomes_fonte || v_entidade_fonte end;
    select e.nome_canonico into v_entidade from public.despesa_entidades e where e.nif = v_nif;
    v_meta := v_meta || jsonb_build_object('entidade_fonte', v_entidade_fonte);
  end if;

  insert into public.despesas_publicas (
    id, tipo, titulo, entidade, entidade_nif, montante_eur, moeda,
    data_publicacao, data_inicio, data_fim, descricao, categoria,
    links, meta, source, source_id, last_synced_at, updated_at
  ) values (
    v_id,
    coalesce((p ->> 'tipo')::public.despesa_tipo, 'contrato_publico'),
    coalesce(p ->> 'titulo', ''),
    coalesce(v_entidade, ''),
    v_nif,
    nullif(p ->> 'montante_eur', '')::numeric,
    coalesce(p ->> 'moeda', 'EUR'),
    nullif(p ->> 'data_publicacao', '')::date,
    nullif(p ->> 'data_inicio', '')::date,
    nullif(p ->> 'data_fim', '')::date,
    coalesce(p ->> 'descricao', ''),
    coalesce(p ->> 'categoria', ''),
    coalesce(p -> 'links', '[]'::jsonb),
    v_meta,
    v_source,
    p ->> 'source_id',
    now(),
    now()
  )
  on conflict (id) do update set
    tipo = excluded.tipo,
    titulo = excluded.titulo,
    entidade = excluded.entidade,
    entidade_nif = excluded.entidade_nif,
    montante_eur = excluded.montante_eur,
    moeda = excluded.moeda,
    data_publicacao = excluded.data_publicacao,
    data_inicio = excluded.data_inicio,
    data_fim = excluded.data_fim,
    descricao = excluded.descricao,
    categoria = excluded.categoria,
    links = excluded.links,
    meta = excluded.meta,
    source = excluded.source,
    source_id = excluded.source_id,
    last_synced_at = now(),
    updated_at = now();

  return v_id;
end;
$$;

revoke all on function public.upsert_despesa_publica(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_despesa_publica(jsonb) to service_role;

-- Investimento Base tem de espelhar uma despesa hash existente (inv-<despesa_id>).
create or replace function public.check_investimento_base_mirror()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.source = 'base.gov.pt' then
    if new.despesa_id is null or new.id <> 'inv-' || new.despesa_id
       or not exists (select 1 from public.despesas_publicas d where d.id = new.despesa_id) then
      raise exception 'INVESTIMENTO_SEM_DESPESA: % → % (esperado inv-<despesa_id> de uma despesa existente)',
        new.id, new.despesa_id using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists investimentos_base_mirror_chk on public.investimentos;
create trigger investimentos_base_mirror_chk
  before insert or update of id, despesa_id, source on public.investimentos
  for each row execute function public.check_investimento_base_mirror();

-- ---------------------------------------------------------------------------
-- 7) Métrica “investimentos” = contratos ≥ 100 000 € (vista de Despesa)
-- ---------------------------------------------------------------------------
create or replace view public.metricas_globais
with (security_invoker = true)
as
select
  public.count_cidadaos_registados() as cidadaos_registados,
  (select coalesce(sum(favor + contra + abstencao), 0)::bigint from public.iniciativa_voto_counts)
    as votos_emitidos,
  (select count(*)::bigint from public.iniciativas) as iniciativas_disponiveis,
  (select count(*)::bigint from public.daily_digests) as digests,
  (select count(*)::bigint from public.despesas_publicas) as despesas,
  (select count(*)::bigint from public.despesas_publicas where montante_eur >= 100000)
    as investimentos,
  (select count(*)::bigint from public.comunicados) as comunicados,
  case
    when public.count_cidadaos_registados() = 0
      or (select count(*) from public.iniciativas) = 0
      or (select coalesce(sum(favor + contra + abstencao), 0) from public.iniciativa_voto_counts) = 0
    then 0::numeric
    else round(
      (
        (select coalesce(sum(favor + contra + abstencao), 0)::numeric from public.iniciativa_voto_counts)
        / nullif(public.count_cidadaos_registados()::numeric, 0)
        / nullif((select count(*)::numeric from public.iniciativas), 0)
      ) * 100,
      1
    )
  end as taxa_participacao_media;

grant select on public.metricas_globais to anon, authenticated;

comment on view public.metricas_globais is
  'Agregados públicos. "investimentos" = contratos de Despesa com montante ≥ 100 000 € (não é outra fonte). security_invoker=true.';
