-- Integração do plano de conteúdo (A + B + C): definição única de metricas_globais.
-- Substitui as versões de 20260812160000 e de 20261023122000 (plano C). Mantém os nomes e a
-- ordem das colunas (o frontend lê `select *`), só muda o que cada uma conta:
--   iniciativas_disponiveis  = iniciativas sem procedimentos internos da AR (plano A: ocultos por defeito)
--   investimentos            = contratos de Despesa com montante ≥ 100 000 € (plano C: /contratos)
--   comunicados              = comunicados e notícias do Governo, sem nomeações (plano B)
--   digests                  = resumos do dia AR (daily_digests), como antes
-- Ordem: tem de correr depois de 20261023120000 (coluna iniciativas.procedimento) e de
-- 20261023121000 (tipo 'nomeacao').

create or replace view public.metricas_globais
with (security_invoker = true)
as
with ini as (
  select count(*)::bigint as n from public.iniciativas where not procedimento
), votos as (
  select coalesce(sum(favor + contra + abstencao), 0)::bigint as n from public.iniciativa_voto_counts
)
select
  public.count_cidadaos_registados() as cidadaos_registados,
  (select n from votos) as votos_emitidos,
  (select n from ini) as iniciativas_disponiveis,
  (select count(*)::bigint from public.daily_digests) as digests,
  (select count(*)::bigint from public.despesas_publicas) as despesas,
  (select count(*)::bigint from public.despesas_publicas where montante_eur >= 100000)
    as investimentos,
  (select count(*)::bigint from public.comunicados where tipo <> 'nomeacao') as comunicados,
  case
    when public.count_cidadaos_registados() = 0
      or (select n from ini) = 0
      or (select n from votos) = 0
    then 0::numeric
    else round(
      (
        (select n from votos)::numeric
        / nullif(public.count_cidadaos_registados()::numeric, 0)
        / nullif((select n from ini)::numeric, 0)
      ) * 100,
      1
    )
  end as taxa_participacao_media;

grant select on public.metricas_globais to anon, authenticated;

comment on view public.metricas_globais is
  'Agregados públicos. iniciativas_disponiveis sem procedimentos; "investimentos" = contratos de Despesa ≥ 100 000 € (página /contratos); comunicados sem nomeações. security_invoker=true.';
