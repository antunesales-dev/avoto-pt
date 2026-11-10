-- Supabase advisors (performance), sem mudar semântica:
-- 1) auth_rls_initplan: auth.uid() -> (select auth.uid()) nas políticas "own"
--    (avaliado uma vez por query em vez de por linha). ALTER POLICY mantém
--    roles, comando e PERMISSIVE; só muda a expressão.
-- 2) unindexed_foreign_keys: índice para investimentos.despesa_id (FK com ON DELETE SET NULL).
-- 3) duplicate_index: investimentos_id_uidx é igual a investimentos_pkey (btree(id), unique)
--    e nenhuma constraint depende dele; a PK continua a garantir a unicidade.
-- Índices "unused" ficam (não removidos de propósito).

-- 1) RLS initplan
alter policy device_accounts_insert_own on public.device_accounts
  with check (user_id = (select auth.uid()));
alter policy device_accounts_select_own on public.device_accounts
  using (user_id = (select auth.uid()));
alter policy device_accounts_update_own on public.device_accounts
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy notif_prefs_insert_own on public.notification_prefs
  with check (user_id = (select auth.uid()));
alter policy notif_prefs_select_own on public.notification_prefs
  using (user_id = (select auth.uid()));
alter policy notif_prefs_update_own on public.notification_prefs
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy profiles_select_own on public.profiles
  using (id = (select auth.uid()));
alter policy profiles_update_own on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy push_sub_delete_own on public.push_subscriptions
  using (user_id = (select auth.uid()));
alter policy push_sub_insert_own on public.push_subscriptions
  with check (user_id = (select auth.uid()));
alter policy push_sub_select_own on public.push_subscriptions
  using (user_id = (select auth.uid()));
alter policy push_sub_update_own on public.push_subscriptions
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy votos_insert_own on public.votos_cidadaos
  with check (user_id = (select auth.uid()));
alter policy votos_select_own on public.votos_cidadaos
  using (user_id = (select auth.uid()));

alter policy votos_inv_insert_own on public.votos_investimentos
  with check (user_id = (select auth.uid()));
alter policy votos_inv_select_own on public.votos_investimentos
  using (user_id = (select auth.uid()));

-- 2) FK sem índice
create index if not exists investimentos_despesa_id_idx
  on public.investimentos (despesa_id);

-- 3) índice duplicado da PK
drop index if exists public.investimentos_id_uidx;
