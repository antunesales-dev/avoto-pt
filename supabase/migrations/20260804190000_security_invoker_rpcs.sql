-- =============================================================================
-- Linter 0028 / 0029: RPCs públicas em SECURITY INVOKER + RLS própria.
-- Crypto / rate-limit / audit / contadores ficam em private.* (SECURITY DEFINER,
-- schema não exposto no PostgREST) — o linter só aponta public + EXECUTE.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Contagem pública de cidadãos sem DEFINER em public
-- ---------------------------------------------------------------------------
create table if not exists public.platform_stats (
  id integer primary key default 1 check (id = 1),
  cidadaos_registados bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.platform_stats (id, cidadaos_registados)
select 1, (select count(*)::bigint from public.profiles)
on conflict (id) do update
  set cidadaos_registados = excluded.cidadaos_registados,
      updated_at = now();

alter table public.platform_stats enable row level security;

drop policy if exists platform_stats_select_all on public.platform_stats;
create policy platform_stats_select_all
  on public.platform_stats for select
  to anon, authenticated
  using (true);

-- sem escrita cliente
drop policy if exists platform_stats_no_write_i on public.platform_stats;
drop policy if exists platform_stats_no_write_u on public.platform_stats;
drop policy if exists platform_stats_no_write_d on public.platform_stats;
create policy platform_stats_no_write_i
  on public.platform_stats for insert to anon, authenticated with check (false);
create policy platform_stats_no_write_u
  on public.platform_stats for update to anon, authenticated using (false) with check (false);
create policy platform_stats_no_write_d
  on public.platform_stats for delete to anon, authenticated using (false);

grant select on public.platform_stats to anon, authenticated;

create or replace function private.trg_profiles_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.platform_stats (id, cidadaos_registados)
    values (1, 1)
    on conflict (id) do update
      set cidadaos_registados = public.platform_stats.cidadaos_registados + 1,
          updated_at = now();
    return new;
  elsif tg_op = 'DELETE' then
    update public.platform_stats
    set cidadaos_registados = greatest(0, cidadaos_registados - 1),
        updated_at = now()
    where id = 1;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists profiles_stats_ins on public.profiles;
drop trigger if exists profiles_stats_del on public.profiles;
create trigger profiles_stats_ins
  after insert on public.profiles
  for each row execute function private.trg_profiles_stats();
create trigger profiles_stats_del
  after delete on public.profiles
  for each row execute function private.trg_profiles_stats();

-- ---------------------------------------------------------------------------
-- 2) Contadores de votos via trigger DEFINER (cliente não mexe nas contagens)
-- ---------------------------------------------------------------------------
create or replace function private.trg_voto_cidadao_counts()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v text;
begin
  v := private.decrypt_text(new.voto_enc);
  if v is null or v not in ('favor', 'contra', 'abstencao') then
    raise exception 'INVALID_VOTO';
  end if;

  insert into public.iniciativa_voto_counts (iniciativa_id, favor, contra, abstencao)
  values (
    new.iniciativa_id,
    case when v = 'favor' then 1 else 0 end,
    case when v = 'contra' then 1 else 0 end,
    case when v = 'abstencao' then 1 else 0 end
  )
  on conflict (iniciativa_id) do update set
    favor = public.iniciativa_voto_counts.favor
      + case when v = 'favor' then 1 else 0 end,
    contra = public.iniciativa_voto_counts.contra
      + case when v = 'contra' then 1 else 0 end,
    abstencao = public.iniciativa_voto_counts.abstencao
      + case when v = 'abstencao' then 1 else 0 end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists votos_cidadaos_counts on public.votos_cidadaos;
create trigger votos_cidadaos_counts
  after insert on public.votos_cidadaos
  for each row execute function private.trg_voto_cidadao_counts();

create or replace function private.trg_voto_investimento_counts()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v text;
begin
  v := private.decrypt_text(new.voto_enc);
  if v is null or v not in ('favor', 'contra', 'abstencao') then
    raise exception 'INVALID_VOTO';
  end if;

  insert into public.investimento_voto_counts (investimento_id, favor, contra, abstencao)
  values (
    new.investimento_id,
    case when v = 'favor' then 1 else 0 end,
    case when v = 'contra' then 1 else 0 end,
    case when v = 'abstencao' then 1 else 0 end
  )
  on conflict (investimento_id) do update set
    favor = public.investimento_voto_counts.favor
      + case when v = 'favor' then 1 else 0 end,
    contra = public.investimento_voto_counts.contra
      + case when v = 'contra' then 1 else 0 end,
    abstencao = public.investimento_voto_counts.abstencao
      + case when v = 'abstencao' then 1 else 0 end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists votos_investimentos_counts on public.votos_investimentos;
create trigger votos_investimentos_counts
  after insert on public.votos_investimentos
  for each row execute function private.trg_voto_investimento_counts();

-- ---------------------------------------------------------------------------
-- 3) RLS: utilizador só acede aos próprios registos (permite INVOKER)
-- ---------------------------------------------------------------------------

-- profiles: ler e actualizar só a própria linha (partido via RPC; cid imutável na prática)
drop policy if exists profiles_no_direct_select on public.profiles;
drop policy if exists profiles_no_direct_update on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- votos: insert + select próprios; sem update/delete
drop policy if exists votos_no_direct_select on public.votos_cidadaos;
drop policy if exists votos_no_direct_insert on public.votos_cidadaos;
drop policy if exists votos_select_own on public.votos_cidadaos;
drop policy if exists votos_insert_own on public.votos_cidadaos;

create policy votos_select_own
  on public.votos_cidadaos for select
  to authenticated
  using (user_id = auth.uid());

create policy votos_insert_own
  on public.votos_cidadaos for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists votos_inv_no_select on public.votos_investimentos;
drop policy if exists votos_inv_no_insert on public.votos_investimentos;
drop policy if exists votos_inv_select_own on public.votos_investimentos;
drop policy if exists votos_inv_insert_own on public.votos_investimentos;

create policy votos_inv_select_own
  on public.votos_investimentos for select
  to authenticated
  using (user_id = auth.uid());

create policy votos_inv_insert_own
  on public.votos_investimentos for insert
  to authenticated
  with check (user_id = auth.uid());

-- device_accounts: insert próprio
drop policy if exists device_accounts_no_client_write on public.device_accounts;
drop policy if exists device_accounts_insert_own on public.device_accounts;

create policy device_accounts_insert_own
  on public.device_accounts for insert
  to authenticated
  with check (user_id = auth.uid());

-- update last_seen via RPC (UPSERT): precisa de update own
drop policy if exists device_accounts_no_client_update on public.device_accounts;
drop policy if exists device_accounts_update_own on public.device_accounts;

create policy device_accounts_update_own
  on public.device_accounts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert on public.votos_cidadaos to authenticated;
grant select, insert on public.votos_investimentos to authenticated;
grant select, insert, update on public.device_accounts to authenticated;
-- profiles: SELECT própria linha; UPDATE só colunas de preferência (não cid)
grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (partido_preferencia_enc, updated_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 4) private helpers: autenticados podem chamar (schema private ≠ API REST)
--    check_rate_limit: se JWT authenticated, subject = auth.uid() apenas
-- ---------------------------------------------------------------------------
create or replace function private.check_rate_limit(
  p_subject text,
  p_action text,
  p_window_seconds integer default 60,
  p_max_hits integer default 10
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w_start timestamptz;
  hits integer;
  subj text := p_subject;
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  -- API autenticada não pode consumir buckets de outros subjects
  if jwt_role = 'authenticated' then
    if auth.uid() is null then
      raise exception 'AUTH_REQUIRED' using errcode = '42501';
    end if;
    subj := auth.uid()::text;
  end if;

  if subj is null or subj = '' then
    raise exception 'RATE_LIMIT_SUBJECT_REQUIRED' using errcode = '22023';
  end if;

  w_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_buckets (subject, action, window_start, hit_count)
  values (subj, p_action, w_start, 1)
  on conflict (subject, action, window_start)
  do update set hit_count = public.rate_limit_buckets.hit_count + 1
  returning hit_count into hits;

  if hits > p_max_hits then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.check_rate_limit(text, text, integer, integer) from public, anon;
grant execute on function private.check_rate_limit(text, text, integer, integer) to authenticated, service_role;

revoke all on function private.encrypt_text(text) from public, anon;
grant execute on function private.encrypt_text(text) to authenticated, service_role;

revoke all on function private.decrypt_text(bytea) from public, anon;
grant execute on function private.decrypt_text(bytea) to authenticated, service_role;

revoke all on function private.hash_identifier(text) from public, anon;
grant execute on function private.hash_identifier(text) to authenticated, service_role;

revoke all on function private.audit_log(text, text, jsonb) from public, anon;
grant execute on function private.audit_log(text, text, jsonb) to authenticated, service_role;

-- user_data_key nunca para clientes
revoke all on function private.user_data_key() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) RPCs públicas → SECURITY INVOKER
-- ---------------------------------------------------------------------------

create or replace function public.count_cidadaos_registados()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select s.cidadaos_registados from public.platform_stats s where s.id = 1),
    0::bigint
  );
$$;

revoke all on function public.count_cidadaos_registados() from public;
grant execute on function public.count_cidadaos_registados() to anon, authenticated, service_role;

create or replace function public.platform_health()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'iniciativas', (select count(*) from public.iniciativas),
    'cidadaos', public.count_cidadaos_registados(),
    'votos', (select coalesce(sum(favor + contra + abstencao), 0) from public.iniciativa_voto_counts),
    'despesas', (select count(*) from public.despesas_publicas),
    'investimentos', (select count(*) from public.investimentos),
    'digests', (select count(*) from public.daily_digests),
    'last_ar_sync', (
      select jsonb_build_object(
        'id', id, 'status', status, 'finished_at', finished_at, 'upserted', upserted
      )
      from public.ar_sync_runs
      order by started_at desc
      limit 1
    )
  );
$$;

revoke all on function public.platform_health() from public;
grant execute on function public.platform_health() to anon, authenticated, service_role;

create or replace function public.get_my_profile()
returns table (
  id uuid,
  cid text,
  partido_preferencia text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.cid,
    private.decrypt_text(p.partido_preferencia_enc) as partido_preferencia,
    p.created_at,
    p.updated_at
  from public.profiles p
  where p.id = uid;
end;
$$;

create or replace function public.update_my_partido(p_partido text)
returns table (
  id uuid,
  cid text,
  partido_preferencia text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
  clean text := nullif(trim(p_partido), '');
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  perform private.check_rate_limit(uid::text, 'update_partido', 60, 10);

  update public.profiles
  set
    partido_preferencia_enc = private.encrypt_text(clean),
    updated_at = now()
  where public.profiles.id = uid;

  return query select * from public.get_my_profile();
end;
$$;

create or replace function public.cast_voto(
  p_iniciativa_id text,
  p_voto public.voto_sentido
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
  enc bytea;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  perform private.check_rate_limit(uid::text, 'cast_voto', 60, 20);

  if not exists (select 1 from public.iniciativas i where i.id = p_iniciativa_id) then
    raise exception 'INICIATIVA_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.votos_cidadaos v
    where v.user_id = uid and v.iniciativa_id = p_iniciativa_id
  ) then
    raise exception 'ALREADY_VOTED' using errcode = '23505';
  end if;

  enc := private.encrypt_text(p_voto::text);

  insert into public.votos_cidadaos (user_id, iniciativa_id, voto_enc)
  values (uid, p_iniciativa_id, enc);
  -- contagens: trigger private.trg_voto_cidadao_counts

  perform private.audit_log(
    'cast_voto',
    p_iniciativa_id,
    jsonb_build_object('voto', p_voto)
  );

  return jsonb_build_object(
    'iniciativa_id', p_iniciativa_id,
    'voto', p_voto,
    'created_at', now()
  );
end;
$$;

create or replace function public.cast_voto_investimento(
  p_investimento_id text,
  p_voto public.voto_sentido
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
  enc bytea;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  perform private.check_rate_limit(uid::text, 'cast_voto_investimento', 60, 20);

  if not exists (select 1 from public.investimentos i where i.id = p_investimento_id) then
    raise exception 'INVESTIMENTO_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.votos_investimentos v
    where v.user_id = uid and v.investimento_id = p_investimento_id
  ) then
    raise exception 'ALREADY_VOTED' using errcode = '23505';
  end if;

  enc := private.encrypt_text(p_voto::text);

  insert into public.votos_investimentos (user_id, investimento_id, voto_enc)
  values (uid, p_investimento_id, enc);

  perform private.audit_log(
    'cast_voto_investimento',
    p_investimento_id,
    jsonb_build_object('voto', p_voto)
  );

  return jsonb_build_object(
    'investimento_id', p_investimento_id,
    'voto', p_voto,
    'created_at', now()
  );
end;
$$;

create or replace function public.get_my_voto(p_iniciativa_id text)
returns text
language plpgsql
stable
security invoker
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
  cipher bytea;
begin
  if uid is null then
    return null;
  end if;

  select v.voto_enc into cipher
  from public.votos_cidadaos v
  where v.user_id = uid and v.iniciativa_id = p_iniciativa_id;

  if cipher is null then
    return null;
  end if;

  return private.decrypt_text(cipher);
end;
$$;

create or replace function public.get_my_voto_investimento(p_investimento_id text)
returns text
language plpgsql
stable
security invoker
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
  cipher bytea;
begin
  if uid is null then return null; end if;
  select v.voto_enc into cipher
  from public.votos_investimentos v
  where v.user_id = uid and v.investimento_id = p_investimento_id;
  if cipher is null then return null; end if;
  return private.decrypt_text(cipher);
end;
$$;

create or replace function public.list_my_votos()
returns table (
  iniciativa_id text,
  voto text,
  created_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    v.iniciativa_id,
    private.decrypt_text(v.voto_enc) as voto,
    v.created_at
  from public.votos_cidadaos v
  where v.user_id = uid
  order by v.created_at desc;
end;
$$;

create or replace function public.register_device_account(p_device_id text)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
  v_device text;
  v_count integer;
  v_max integer := 2;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_device_id is null or length(trim(p_device_id)) < 8 then
    raise exception 'DEVICE_ID_REQUIRED' using errcode = '22023';
  end if;

  v_device := private.hash_identifier('dev:' || p_device_id);

  insert into public.device_accounts (device_hash, user_id)
  values (v_device, uid)
  on conflict (device_hash, user_id) do update
    set last_seen_at = now();

  select count(*)::integer into v_count
  from public.device_accounts
  where device_hash = v_device;

  return jsonb_build_object(
    'ok', true,
    'linked', true,
    'device_accounts', v_count,
    'max_accounts', v_max
  );
end;
$$;

-- ensure_notification_prefs: TRIGGER only — DEFINER ok no owner; sem EXECUTE na API
revoke all on function public.ensure_notification_prefs() from public, anon, authenticated;
-- service_role também não precisa chamar via RPC

-- Grants finais das RPCs de app (INVOKER)
revoke all on function public.get_my_profile() from public, anon;
revoke all on function public.update_my_partido(text) from public, anon;
revoke all on function public.cast_voto(text, public.voto_sentido) from public, anon;
revoke all on function public.cast_voto_investimento(text, public.voto_sentido) from public, anon;
revoke all on function public.get_my_voto(text) from public, anon;
revoke all on function public.get_my_voto_investimento(text) from public, anon;
revoke all on function public.list_my_votos() from public, anon;
revoke all on function public.register_device_account(text) from public, anon;

grant execute on function public.get_my_profile() to authenticated, service_role;
grant execute on function public.update_my_partido(text) to authenticated, service_role;
grant execute on function public.cast_voto(text, public.voto_sentido) to authenticated, service_role;
grant execute on function public.cast_voto_investimento(text, public.voto_sentido) to authenticated, service_role;
grant execute on function public.get_my_voto(text) to authenticated, service_role;
grant execute on function public.get_my_voto_investimento(text) to authenticated, service_role;
grant execute on function public.list_my_votos() to authenticated, service_role;
grant execute on function public.register_device_account(text) to authenticated, service_role;

comment on function public.count_cidadaos_registados() is
  'INVOKER: lê platform_stats (público). Sem SECURITY DEFINER.';
comment on function public.platform_health() is
  'INVOKER: contagens em tabelas com SELECT público / platform_stats.';
comment on function public.cast_voto(text, public.voto_sentido) is
  'INVOKER + RLS own-row. Contagens via trigger private.';
