-- OTP: limites um pouco mais generosos (dev/uso real — 4 emails/hora era fácil esgotar em testes)
-- Reafirmar grants cast_voto / upsert (logs 42501 com auth_user null = chamadas sem JWT; grants OK)

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

  -- rate limits (janela 1h) — IP / device / email
  perform private.check_rate_limit(v_ip, 'auth_otp_ip', 3600, 20);
  perform private.check_rate_limit(v_device, 'auth_otp_device', 3600, 12);
  perform private.check_rate_limit(v_email, 'auth_otp_email', 3600, 10);

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
revoke all on function public.assert_auth_otp_allowed(text, text, text) from anon, authenticated;
grant execute on function public.assert_auth_otp_allowed(text, text, text) to service_role;

-- Reafirmar RPCs de app (authenticated) e sync (service_role)
grant execute on function public.cast_voto(text, public.voto_sentido) to authenticated, service_role;
grant execute on function public.cast_voto_investimento(text, public.voto_sentido) to authenticated, service_role;
grant execute on function public.get_my_profile() to authenticated, service_role;
grant execute on function public.get_my_voto(text) to authenticated, service_role;
grant execute on function public.get_my_voto_investimento(text) to authenticated, service_role;
grant execute on function public.list_my_votos() to authenticated, service_role;
grant execute on function public.update_my_partido(text) to authenticated, service_role;
grant execute on function public.register_device_account(text) to authenticated, service_role;
grant execute on function public.upsert_iniciativa_from_ar(jsonb) to service_role;
grant execute on function public.upsert_despesa_publica(jsonb) to service_role;
grant execute on function public.upsert_investimento(jsonb) to service_role;

-- Limpar contadores OTP antigos (desbloqueia quem ficou preso no 429 de testes)
delete from public.rate_limit_buckets
where action in ('auth_otp_ip', 'auth_otp_device', 'auth_otp_email');
