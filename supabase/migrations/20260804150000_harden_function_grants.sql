-- Hardening: search_path + grants EXECUTE por role
-- Corrige linter:
--   0011 function_search_path_mutable (generate_cid)
--   0028 anon_security_definer_function_executable
--   0029 authenticated em RPCs só de serviço (upsert_*, generate_daily_digest, …)
--
-- Nota: em Postgres, funções novas recebem EXECUTE para PUBLIC por omissão;
-- revoke from public não chega se também houver grants implícitos a anon.
-- Aqui revogamos PUBLIC + anon + authenticated e re-concedemos só o necessário.

-- ---------------------------------------------------------------------------
-- generate_cid: search_path fixo; só uso interno (trigger handle_new_user)
-- ---------------------------------------------------------------------------
create or replace function public.generate_cid()
returns text
language plpgsql
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'CID-';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper: revogar de API roles
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'generate_cid',
        'handle_new_user',
        'assert_auth_otp_allowed',
        'generate_daily_digest',
        'upsert_despesa_publica',
        'upsert_investimento',
        'upsert_iniciativa_from_ar',
        'cast_voto',
        'cast_voto_investimento',
        'get_my_profile',
        'get_my_voto',
        'get_my_voto_investimento',
        'list_my_votos',
        'update_my_partido',
        'register_device_account',
        'ensure_notification_prefs',
        'count_cidadaos_registados',
        'platform_health'
      ])
  loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke all on function %s from anon', r.sig);
    execute format('revoke all on function %s from authenticated', r.sig);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Só service_role (edge / cron / sync) — nunca via PostgREST com anon/JWT user
-- ---------------------------------------------------------------------------
grant execute on function public.assert_auth_otp_allowed(text, text, text) to service_role;
grant execute on function public.generate_daily_digest(date) to service_role;
grant execute on function public.upsert_despesa_publica(jsonb) to service_role;
grant execute on function public.upsert_investimento(jsonb) to service_role;
grant execute on function public.upsert_iniciativa_from_ar(jsonb) to service_role;

-- trigger helpers: sem EXECUTE na API (o trigger corre como owner)
-- generate_cid / handle_new_user: sem grant a anon/authenticated/service (owner executa)

-- ---------------------------------------------------------------------------
-- authenticated only (app logada)
-- ---------------------------------------------------------------------------
grant execute on function public.cast_voto(text, public.voto_sentido) to authenticated;
grant execute on function public.cast_voto_investimento(text, public.voto_sentido) to authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.get_my_voto(text) to authenticated;
grant execute on function public.get_my_voto_investimento(text) to authenticated;
grant execute on function public.list_my_votos() to authenticated;
grant execute on function public.update_my_partido(text) to authenticated;
grant execute on function public.register_device_account(text) to authenticated;
grant execute on function public.ensure_notification_prefs() to authenticated;

-- ---------------------------------------------------------------------------
-- Públicos intencionais (métricas / health)
-- ---------------------------------------------------------------------------
grant execute on function public.platform_health() to anon, authenticated, service_role;
grant execute on function public.count_cidadaos_registados() to anon, authenticated, service_role;

-- service_role também pode chamar RPCs de utilizador (ops / testes)
grant execute on function public.cast_voto(text, public.voto_sentido) to service_role;
grant execute on function public.cast_voto_investimento(text, public.voto_sentido) to service_role;
grant execute on function public.get_my_profile() to service_role;
grant execute on function public.get_my_voto(text) to service_role;
grant execute on function public.get_my_voto_investimento(text) to service_role;
grant execute on function public.list_my_votos() to service_role;
grant execute on function public.update_my_partido(text) to service_role;
grant execute on function public.register_device_account(text) to service_role;
grant execute on function public.ensure_notification_prefs() to service_role;
