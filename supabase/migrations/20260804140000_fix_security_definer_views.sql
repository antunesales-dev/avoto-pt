-- Fix Supabase linter 0010_security_definer_view
-- Views públicas passam a security_invoker=true (respeitam RLS do caller).
-- Contagens de votos já vêm de tabelas com SELECT público (iniciativa_voto_counts, etc.).
-- Count de profiles: função SECURITY DEFINER mínima (só devolve um bigint, sem expor linhas).

-- ---------------------------------------------------------------------------
-- Count de cidadãos (profiles) sem expor a tabela via view DEFINER
-- ---------------------------------------------------------------------------
create or replace function public.count_cidadaos_registados()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::bigint from public.profiles;
$$;

revoke all on function public.count_cidadaos_registados() from public;
grant execute on function public.count_cidadaos_registados() to anon, authenticated;

comment on function public.count_cidadaos_registados() is
  'Agregado público: número de contas (profiles). SECURITY DEFINER só para contagem; não devolve linhas.';

-- ---------------------------------------------------------------------------
-- iniciativa_votos_agg
-- ---------------------------------------------------------------------------
drop view if exists public.iniciativa_votos_agg;

create view public.iniciativa_votos_agg
with (security_invoker = true)
as
select
  c.iniciativa_id,
  c.favor,
  c.contra,
  c.abstencao,
  (c.favor + c.contra + c.abstencao)::bigint as total
from public.iniciativa_voto_counts c;

grant select on public.iniciativa_votos_agg to anon, authenticated;

comment on view public.iniciativa_votos_agg is
  'Agregados públicos de votos por iniciativa (tabela de contadores). security_invoker=true.';

-- ---------------------------------------------------------------------------
-- investimento_votos_agg
-- ---------------------------------------------------------------------------
drop view if exists public.investimento_votos_agg;

create view public.investimento_votos_agg
with (security_invoker = true)
as
select
  c.investimento_id,
  c.favor,
  c.contra,
  c.abstencao,
  (c.favor + c.contra + c.abstencao)::bigint as total
from public.investimento_voto_counts c;

grant select on public.investimento_votos_agg to anon, authenticated;

comment on view public.investimento_votos_agg is
  'Agregados públicos de votos por investimento. security_invoker=true.';

-- ---------------------------------------------------------------------------
-- metricas_globais
-- ---------------------------------------------------------------------------
drop view if exists public.metricas_globais;

create view public.metricas_globais
with (security_invoker = true)
as
select
  public.count_cidadaos_registados() as cidadaos_registados,
  (select coalesce(sum(favor + contra + abstencao), 0)::bigint from public.iniciativa_voto_counts)
    as votos_emitidos,
  (select count(*)::bigint from public.iniciativas) as iniciativas_disponiveis,
  (select count(*)::bigint from public.daily_digests) as digests,
  (select count(*)::bigint from public.despesas_publicas) as despesas,
  (select count(*)::bigint from public.investimentos) as investimentos,
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
  'Agregados públicos. security_invoker=true; count de profiles via count_cidadaos_registados().';
