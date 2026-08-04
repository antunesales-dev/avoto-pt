-- Linter 0008: RLS enabled without policies looks like a misconfig.
-- Intent is deny-all for API (anon/authenticated). Make it explicit with USING (false).
-- service_role / security definer functions bypass RLS and still work.

-- rate_limit_buckets: only private.check_rate_limit (DEFINER) writes
drop policy if exists rate_limit_buckets_deny_all on public.rate_limit_buckets;
create policy rate_limit_buckets_deny_select
  on public.rate_limit_buckets for select
  to anon, authenticated
  using (false);
create policy rate_limit_buckets_deny_insert
  on public.rate_limit_buckets for insert
  to anon, authenticated
  with check (false);
create policy rate_limit_buckets_deny_update
  on public.rate_limit_buckets for update
  to anon, authenticated
  using (false)
  with check (false);
create policy rate_limit_buckets_deny_delete
  on public.rate_limit_buckets for delete
  to anon, authenticated
  using (false);

comment on table public.rate_limit_buckets is
  'Rate limits internos. RLS: deny-all na API; escrita só via private.check_rate_limit (security definer).';

-- audit_events: only private.audit_log (DEFINER) inserts
drop policy if exists audit_events_deny_all on public.audit_events;
create policy audit_events_deny_select
  on public.audit_events for select
  to anon, authenticated
  using (false);
create policy audit_events_deny_insert
  on public.audit_events for insert
  to anon, authenticated
  with check (false);
create policy audit_events_deny_update
  on public.audit_events for update
  to anon, authenticated
  using (false)
  with check (false);
create policy audit_events_deny_delete
  on public.audit_events for delete
  to anon, authenticated
  using (false);

comment on table public.audit_events is
  'Auditoria interna. RLS: deny-all na API; escrita só via private.audit_log (security definer).';
