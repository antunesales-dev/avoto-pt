-- Endurecimento: privilégios mínimos para os papéis de cliente (anon, authenticated)
-- nas tabelas e vistas de public. Defesa em profundidade: a RLS continua a ser a
-- barreira principal e NÃO é alterada aqui (nem políticas, nem funções, nem dados).
--
-- Porquê: por defeito o Supabase concede ALL (incl. TRUNCATE) a anon/authenticated
-- em todas as tabelas novas. TRUNCATE não passa pela RLS. As escritas que a RLS
-- já bloqueia (políticas "false") deixam de estar sequer concedidas.
--
-- Não afecta: service_role (edge functions, scripts, workflows), o dono postgres,
-- nem as funções SECURITY DEFINER (triggers de contagens, rate limit, audit),
-- que correm como postgres.
--
-- Escritas de cliente que se mantêm (verificado em src/ e nas RPCs invoker):
--   votos_cidadaos      INSERT          (cast_voto)
--   votos_investimentos INSERT
--   device_accounts     INSERT, UPDATE  (register_device_account)
--   profiles            UPDATE          (update_my_partido; grants por coluna intactos)
--   notification_prefs  INSERT, UPDATE  (src/lib/notifications.js upsert)
--   push_subscriptions  INSERT, UPDATE, DELETE

-- 1) TRUNCATE / REFERENCES / TRIGGER: nunca precisos pelos clientes.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- 2) anon só lê: nenhuma política permite escrita a anon.
revoke insert, update, delete on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- 3) authenticated: sem escrita directa nas tabelas de conteúdo/sistema
--    (todas têm políticas de escrita "false"; escrevem só service_role ou
--    funções SECURITY DEFINER).
revoke insert, update, delete on table
  public.ar_sync_runs,
  public.audit_events,
  public.comunicado_iniciativa,
  public.comunicados,
  public.comunicados_digests,
  public.contratos_base,
  public.daily_digests,
  public.despesa_entidades,
  public.despesas_publicas,
  public.donations,
  public.entidades_publicas,
  public.iniciativa_textos,
  public.iniciativa_voto_counts,
  public.iniciativas,
  public.investimento_voto_counts,
  public.investimentos,
  public.platform_stats,
  public.project_outflows,
  public.rate_limit_buckets,
  public.site_settings,
  -- vistas (security_invoker): só leitura
  public.metricas_globais,
  public.despesa_contrato_base,
  public.iniciativa_votos_agg,
  public.investimento_votos_agg,
  public.my_profile_safe
from authenticated;

--    Tabelas do utilizador: retirar só os comandos sem política que os permita.
revoke delete on table public.device_accounts from authenticated;      -- política delete = false
revoke delete on table public.notification_prefs from authenticated;   -- sem política delete
revoke insert, delete on table public.profiles from authenticated;     -- insert = false; perfil criado por trigger
revoke update, delete on table public.votos_investimentos from authenticated; -- voto imutável
revoke update, delete on table public.votos_cidadaos from authenticated;      -- voto imutável (já sem grant em prod)

-- 4) Objectos futuros criados por postgres em public: sem TRUNCATE/REFERENCES/TRIGGER
--    para clientes. (SELECT/INSERT/UPDATE/DELETE por defeito mantêm-se: a RLS decide.)
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

-- 5) As duas RPCs SECURITY DEFINER públicas são intencionais (avisos 0028/0029 do
--    advisor): expõem só colunas públicas das doações, sem argumentos, search_path fixo.
comment on function public.list_donations_ledger() is
  'Público por desenho (SECURITY DEFINER): ledger de doações sem colunas Stripe/meta. Usado em src/stores/financePublic.js.';
comment on function public.financiamento_resumo() is
  'Público por desenho (SECURITY DEFINER): totais agregados de doações/saídas. Usado em src/stores/financePublic.js.';
