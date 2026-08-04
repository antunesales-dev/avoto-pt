-- Transparência: qualquer visitante pode ver o estado dos jobs de importação
-- (sem secrets — só operacional: fonte, status, contagens, horários).

drop policy if exists ar_sync_runs_select_authenticated on public.ar_sync_runs;

create policy ar_sync_runs_select_public
  on public.ar_sync_runs
  for select
  to anon, authenticated
  using (true);

comment on table public.ar_sync_runs is
  'Histórico de syncs oficiais (AR, despesa). SELECT público para transparência; escrita só service_role.';
