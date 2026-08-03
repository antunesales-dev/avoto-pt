-- Métricas: dados oficiais + participação cidadã (honestos, sem inflar)
drop view if exists public.metricas_globais;

create view public.metricas_globais
with (security_invoker = false)
as
select
  (select count(*)::bigint from public.profiles) as cidadaos_registados,
  (select coalesce(sum(favor + contra + abstencao), 0)::bigint from public.iniciativa_voto_counts)
    as votos_emitidos,
  (select count(*)::bigint from public.iniciativas) as iniciativas_disponiveis,
  (select count(*)::bigint from public.daily_digests) as digests,
  (select count(*)::bigint from public.despesas_publicas) as despesas,
  (select count(*)::bigint from public.investimentos) as investimentos,
  -- participação só é significativa com votos; senão 0
  case
    when (select count(*) from public.profiles) = 0
      or (select count(*) from public.iniciativas) = 0
      or (select coalesce(sum(favor + contra + abstencao), 0) from public.iniciativa_voto_counts) = 0
    then 0::numeric
    else round(
      (
        (select coalesce(sum(favor + contra + abstencao), 0)::numeric from public.iniciativa_voto_counts)
        / nullif((select count(*)::numeric from public.profiles), 0)
        / nullif((select count(*)::numeric from public.iniciativas), 0)
      ) * 100,
      1
    )
  end as taxa_participacao_media;

grant select on public.metricas_globais to anon, authenticated;

comment on view public.metricas_globais is
  'Agregados públicos: conteúdo oficial + participação real (sem inventar volume).';
