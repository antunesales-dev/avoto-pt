-- get_my_profile / cast_voto (SECURITY INVOKER) chamam private.encrypt/decrypt.
-- EXECUTE nas funções não chega: o role precisa de USAGE no schema private.
-- Sem isto PostgREST devolve 403 em /rpc/get_my_profile.

grant usage on schema private to authenticated;
grant usage on schema private to service_role;

-- Garantir EXECUTE nas helpers (idempotente)
grant execute on function private.encrypt_text(text) to authenticated, service_role;
grant execute on function private.decrypt_text(bytea) to authenticated, service_role;
grant execute on function private.hash_identifier(text) to authenticated, service_role;
grant execute on function private.check_rate_limit(text, text, integer, integer) to authenticated, service_role;
grant execute on function private.audit_log(text, text, jsonb) to authenticated, service_role;

-- user_data_key continua só owner / definer chain — sem grant a authenticated
revoke all on function private.user_data_key() from public, anon, authenticated;

-- RPCs de app
grant execute on function public.get_my_profile() to authenticated, service_role;
grant execute on function public.list_my_votos() to authenticated, service_role;
grant execute on function public.cast_voto(text, public.voto_sentido) to authenticated, service_role;
grant execute on function public.cast_voto_investimento(text, public.voto_sentido) to authenticated, service_role;
grant execute on function public.update_my_partido(text) to authenticated, service_role;
grant execute on function public.register_device_account(text) to authenticated, service_role;
