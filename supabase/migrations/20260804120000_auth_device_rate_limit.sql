-- =============================================================================
-- Rate limit criação de conta / OTP: IP + dispositivo (anti-duplicação)
-- Não é perfeito (VPN, limpar storage) — reduz abuso óbvio.
-- =============================================================================

-- Contas associadas a um device_id (hash no cliente; sem PII em claro)
create table if not exists public.device_accounts (
  device_hash text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (device_hash, user_id)
);

create index if not exists device_accounts_user_idx on public.device_accounts (user_id);
create index if not exists device_accounts_device_idx on public.device_accounts (device_hash);

alter table public.device_accounts enable row level security;

-- utilizador só vê as suas ligações (opcional; não é obrigatório na UI)
create policy device_accounts_select_own
  on public.device_accounts for select
  to authenticated
  using (user_id = auth.uid());

-- insert/update só via RPC security definer
create policy device_accounts_no_client_write
  on public.device_accounts for insert
  to authenticated, anon
  with check (false);

create policy device_accounts_no_client_update
  on public.device_accounts for update
  to authenticated, anon
  using (false);

create policy device_accounts_no_client_delete
  on public.device_accounts for delete
  to authenticated, anon
  using (false);

grant select on public.device_accounts to authenticated;

comment on table public.device_accounts is
  'Liga device_hash (cliente) a user_id — limite de contas por dispositivo.';

-- ---------------------------------------------------------------------------
-- Hash estável (não reversível) de identificadores de abuso
-- ---------------------------------------------------------------------------
create or replace function private.hash_identifier(p_value text)
returns text
language sql
immutable
security definer
set search_path = public, extensions
as $$
  select encode(
    extensions.digest(
      convert_to(lower(trim(coalesce(p_value, ''))), 'utf8'),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function private.hash_identifier(text) from public;

-- ---------------------------------------------------------------------------
-- Pré-check OTP / registo (só service_role via edge)
-- Limites (ajustáveis):
--   IP:     8 pedidos / hora
--   device: 5 pedidos / hora
--   email:  4 pedidos / hora
--   max contas por device: 2
-- ---------------------------------------------------------------------------
create or replace function public.assert_auth_otp_allowed(
  p_device_id text,
  p_ip text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_device text;
  v_ip text;
  v_email text;
  v_accounts integer;
  v_max_accounts integer := 2;
  v_allow_create boolean := true;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_device_id is null or length(trim(p_device_id)) < 8 then
    raise exception 'DEVICE_ID_REQUIRED' using errcode = '22023';
  end if;
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'EMAIL_INVALID' using errcode = '22023';
  end if;

  v_device := private.hash_identifier('dev:' || p_device_id);
  v_ip := private.hash_identifier('ip:' || coalesce(nullif(trim(p_ip), ''), 'unknown'));
  v_email := private.hash_identifier('em:' || lower(trim(p_email)));

  -- rate limits (janela 1h)
  perform private.check_rate_limit(v_ip, 'auth_otp_ip', 3600, 8);
  perform private.check_rate_limit(v_device, 'auth_otp_device', 3600, 5);
  perform private.check_rate_limit(v_email, 'auth_otp_email', 3600, 4);

  select count(*)::integer into v_accounts
  from public.device_accounts
  where device_hash = v_device;

  if v_accounts >= v_max_accounts then
    v_allow_create := false;
  end if;

  perform private.audit_log(
    'auth_otp_allowed',
    null,
    jsonb_build_object(
      'allow_create', v_allow_create,
      'device_accounts', v_accounts
    )
  );

  return jsonb_build_object(
    'ok', true,
    'allow_create', v_allow_create,
    'device_accounts', v_accounts,
    'max_accounts', v_max_accounts
  );
exception
  when others then
    if sqlerrm like '%RATE_LIMITED%' then
      raise exception 'RATE_LIMITED' using errcode = 'P0001';
    end if;
    raise;
end;
$$;

revoke all on function public.assert_auth_otp_allowed(text, text, text) from public;
grant execute on function public.assert_auth_otp_allowed(text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Após login/registo: associa o dispositivo à conta
-- ---------------------------------------------------------------------------
create or replace function public.register_device_account(p_device_id text)
returns jsonb
language plpgsql
security definer
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

  -- Login de conta existente: sempre liga o device (limite de *criação* é no OTP).
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

revoke all on function public.register_device_account(text) from public;
grant execute on function public.register_device_account(text) to authenticated;

comment on function public.assert_auth_otp_allowed is
  'Edge-only: rate limit OTP por IP/device/email + se pode criar conta nova.';
comment on function public.register_device_account is
  'Liga o device_id do browser ao user autenticado (max 2 contas/device).';
