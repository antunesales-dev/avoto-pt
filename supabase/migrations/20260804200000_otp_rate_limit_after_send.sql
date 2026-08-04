-- OTP: separar “posso tentar?” de “registar tentativa”.
-- Antes: cada clique no botão consumia o bucket mesmo se o email falhasse
-- (ou se o utilizador carregar 5×) → 429 permanente por 1h.
-- Agora: assert só verifica; record só depois de signInWithOtp OK.

-- 1) Verificar limites SEM incrementar
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
  v_ip_hits integer;
  v_dev_hits integer;
  v_em_hits integer;
  -- limites por hora (só leitura; incremento em record_auth_otp_sent)
  v_max_ip integer := 30;
  v_max_device integer := 20;
  v_max_email integer := 15;
  w_start timestamptz;
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

  w_start := to_timestamp(floor(extract(epoch from now()) / 3600) * 3600);

  select coalesce(hit_count, 0) into v_ip_hits
  from public.rate_limit_buckets
  where subject = v_ip and action = 'auth_otp_ip' and window_start = w_start;
  v_ip_hits := coalesce(v_ip_hits, 0);

  select coalesce(hit_count, 0) into v_dev_hits
  from public.rate_limit_buckets
  where subject = v_device and action = 'auth_otp_device' and window_start = w_start;
  v_dev_hits := coalesce(v_dev_hits, 0);

  select coalesce(hit_count, 0) into v_em_hits
  from public.rate_limit_buckets
  where subject = v_email and action = 'auth_otp_email' and window_start = w_start;
  v_em_hits := coalesce(v_em_hits, 0);

  if v_ip_hits >= v_max_ip or v_dev_hits >= v_max_device or v_em_hits >= v_max_email then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_accounts
  from public.device_accounts
  where device_hash = v_device;

  if v_accounts >= v_max_accounts then
    v_allow_create := false;
  end if;

  return jsonb_build_object(
    'ok', true,
    'allow_create', v_allow_create,
    'device_accounts', v_accounts,
    'max_accounts', v_max_accounts,
    'remaining', jsonb_build_object(
      'ip', greatest(0, v_max_ip - v_ip_hits),
      'device', greatest(0, v_max_device - v_dev_hits),
      'email', greatest(0, v_max_email - v_em_hits)
    )
  );
end;
$$;

revoke all on function public.assert_auth_otp_allowed(text, text, text) from public, anon, authenticated;
grant execute on function public.assert_auth_otp_allowed(text, text, text) to service_role;

-- 2) Registar envio bem-sucedido (incrementa buckets)
create or replace function public.record_auth_otp_sent(
  p_device_id text,
  p_ip text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform private.check_rate_limit(
    private.hash_identifier('ip:' || coalesce(nullif(trim(p_ip), ''), 'unknown')),
    'auth_otp_ip', 3600, 30
  );
  perform private.check_rate_limit(
    private.hash_identifier('dev:' || p_device_id),
    'auth_otp_device', 3600, 20
  );
  perform private.check_rate_limit(
    private.hash_identifier('em:' || lower(trim(p_email))),
    'auth_otp_email', 3600, 15
  );

  return jsonb_build_object('ok', true);
exception
  when others then
    -- já enviámos o email: não falhar a resposta ao utilizador
    if sqlerrm like '%RATE_LIMITED%' then
      return jsonb_build_object('ok', true, 'capped', true);
    end if;
    raise;
end;
$$;

revoke all on function public.record_auth_otp_sent(text, text, text) from public, anon, authenticated;
grant execute on function public.record_auth_otp_sent(text, text, text) to service_role;

-- Desbloquear quem ficou preso
delete from public.rate_limit_buckets
where action in ('auth_otp_ip', 'auth_otp_device', 'auth_otp_email');
