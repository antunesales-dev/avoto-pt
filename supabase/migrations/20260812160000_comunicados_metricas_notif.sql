-- Métricas + preferências de notificação para comunicados (info, sem voto).

alter table public.notification_prefs
  add column if not exists notify_comunicados boolean not null default true;

comment on column public.notification_prefs.notify_comunicados is
  'Avisos de novos comunicados oficiais (portugal.gov.pt). Sem voto.';

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
  'Agregados públicos incl. comunicados. security_invoker=true.';

-- Realtime: novos comunicados + despesas (preferência de notificação)
do $$
begin
  begin
    alter publication supabase_realtime add table public.comunicados;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.comunicados_digests;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.despesas_publicas;
  exception when duplicate_object then null;
  end;
end $$;

alter table public.comunicados replica identity full;
alter table public.comunicados_digests replica identity full;
alter table public.despesas_publicas replica identity full;
