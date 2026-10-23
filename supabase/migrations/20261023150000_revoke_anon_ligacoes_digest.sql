-- Hotfix do plano de conteúdo: as três funções SECURITY DEFINER abaixo verificavam
-- `current_user not in ('postgres', 'supabase_admin')`, mas numa função SECURITY DEFINER o
-- current_user é o dono (postgres), por isso a verificação deixava passar anon/authenticated.
-- E o Supabase dá EXECUTE a anon/authenticated por omissão (revoke ... from public não chega).
-- Só o service_role (scripts/edge) as deve chamar.
revoke execute on function public.generate_comunicados_digest(date) from anon, authenticated;
revoke execute on function public.propose_comunicado_links(date, real, int, int, int, int, real) from anon, authenticated;
revoke execute on function public.review_comunicado_link(text, text, boolean, text) from anon, authenticated;
