-- =============================================================================
-- Hardening: rate limits, audit, AR sync state, RLS lock-down, realtime
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Rate limiting (por utilizador autenticado + acção)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_buckets (
  subject text not null,
  action text not null,
  window_start timestamptz not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  primary key (subject, action, window_start)
);

create index if not exists rate_limit_buckets_window_idx
  on public.rate_limit_buckets (window_start);

alter table public.rate_limit_buckets enable row level security;
-- sem policies → ninguém (authenticated/anon) acede; só security definer

comment on table public.rate_limit_buckets is
  'Contadores de rate limit (sem PII legível: subject = user uuid ou ip hash).';

/**
 * Consome 1 hit. Falha com RATE_LIMITED se exceder max_hits na janela.
 * p_window_seconds: tamanho da janela (ex. 60)
 * p_max_hits: máximo de pedidos por janela
 */
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
begin
  if p_subject is null or p_subject = '' then
    raise exception 'RATE_LIMIT_SUBJECT_REQUIRED' using errcode = '22023';
  end if;

  w_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_buckets (subject, action, window_start, hit_count)
  values (p_subject, p_action, w_start, 1)
  on conflict (subject, action, window_start)
  do update set hit_count = public.rate_limit_buckets.hit_count + 1
  returning hit_count into hits;

  if hits > p_max_hits then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.check_rate_limit(text, text, integer, integer) from public;

-- limpeza periódica (chamável por cron edge)
create or replace function private.purge_old_rate_limits(p_older_than interval default interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.rate_limit_buckets
  where window_start < now() - p_older_than;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.purge_old_rate_limits(interval) from public;

-- ---------------------------------------------------------------------------
-- Audit log (eventos de segurança / ops — sem payload sensível em claro)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  actor_id uuid null,
  action text not null,
  resource text null,
  meta jsonb not null default '{}'::jsonb,
  ip_hash text null
);

create index if not exists audit_events_created_idx on public.audit_events (created_at desc);
create index if not exists audit_events_actor_idx on public.audit_events (actor_id);

alter table public.audit_events enable row level security;
-- sem policies para authenticated/anon

create or replace function private.audit_log(
  p_action text,
  p_resource text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_events (actor_id, action, resource, meta)
  values (auth.uid(), p_action, p_resource, coalesce(p_meta, '{}'::jsonb));
end;
$$;

revoke all on function private.audit_log(text, text, jsonb) from public;

-- ---------------------------------------------------------------------------
-- Estado de sincronização AR (ops / edge function)
-- ---------------------------------------------------------------------------
create table if not exists public.ar_sync_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  status text not null default 'running'
    check (status in ('running', 'ok', 'error')),
  source text not null default 'parlamento.pt',
  upserted integer not null default 0,
  skipped integer not null default 0,
  error_message text null,
  meta jsonb not null default '{}'::jsonb
);

alter table public.ar_sync_runs enable row level security;

create policy ar_sync_runs_select_authenticated
  on public.ar_sync_runs for select
  to authenticated
  using (true);

grant select on public.ar_sync_runs to authenticated;

comment on table public.ar_sync_runs is
  'Histórico de imports dos Dados Abertos da AR (visível; sem PII).';

-- Colunas de auditoria em iniciativas
alter table public.iniciativas
  add column if not exists source text not null default 'seed',
  add column if not exists last_synced_at timestamptz null;

-- ---------------------------------------------------------------------------
-- cast_voto: rate limit + audit (versão com voto_enc)
-- ---------------------------------------------------------------------------
create or replace function public.cast_voto(
  p_iniciativa_id text,
  p_voto public.voto_sentido
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
  enc bytea;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  -- máx. 20 votos / minuto / user (anti-script; 1 voto/item continua na constraint)
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

  insert into public.iniciativa_voto_counts (iniciativa_id, favor, contra, abstencao)
  values (
    p_iniciativa_id,
    case when p_voto = 'favor' then 1 else 0 end,
    case when p_voto = 'contra' then 1 else 0 end,
    case when p_voto = 'abstencao' then 1 else 0 end
  )
  on conflict (iniciativa_id) do update set
    favor = public.iniciativa_voto_counts.favor
      + case when p_voto = 'favor' then 1 else 0 end,
    contra = public.iniciativa_voto_counts.contra
      + case when p_voto = 'contra' then 1 else 0 end,
    abstencao = public.iniciativa_voto_counts.abstencao
      + case when p_voto = 'abstencao' then 1 else 0 end,
    updated_at = now();

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

revoke all on function public.cast_voto(text, public.voto_sentido) from public;
grant execute on function public.cast_voto(text, public.voto_sentido) to authenticated;

-- Rate limit também em update_my_partido
create or replace function public.update_my_partido(p_partido text)
returns table (
  id uuid,
  cid text,
  partido_preferencia text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
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

-- ---------------------------------------------------------------------------
-- RLS: iniciativas só leitura; writes via service_role (bypass)
-- ---------------------------------------------------------------------------
drop policy if exists iniciativas_select_all on public.iniciativas;
create policy iniciativas_select_all
  on public.iniciativas for select
  to anon, authenticated
  using (true);

-- bloquear writes explícitos de clients
create policy iniciativas_no_client_insert
  on public.iniciativas for insert
  to authenticated, anon
  with check (false);

create policy iniciativas_no_client_update
  on public.iniciativas for update
  to authenticated, anon
  using (false)
  with check (false);

create policy iniciativas_no_client_delete
  on public.iniciativas for delete
  to authenticated, anon
  using (false);

-- contadores: só select
drop policy if exists iniciativa_voto_counts_select_all on public.iniciativa_voto_counts;
create policy iniciativa_voto_counts_select_all
  on public.iniciativa_voto_counts for select
  to anon, authenticated
  using (true);

create policy iniciativa_voto_counts_no_client_write
  on public.iniciativa_voto_counts for insert
  to authenticated, anon
  with check (false);

create policy iniciativa_voto_counts_no_client_update
  on public.iniciativa_voto_counts for update
  to authenticated, anon
  using (false)
  with check (false);

create policy iniciativa_voto_counts_no_client_delete
  on public.iniciativa_voto_counts for delete
  to authenticated, anon
  using (false);

-- ---------------------------------------------------------------------------
-- Realtime: contagens de votos (público, sem PII)
-- ---------------------------------------------------------------------------
do $$
begin
  -- publication pode já existir em projectos novos
  begin
    alter publication supabase_realtime add table public.iniciativa_voto_counts;
  exception
    when duplicate_object then null;
    when undefined_object then
      -- fallback: criar publication se necessário (hosted já tem supabase_realtime)
      null;
  end;
end;
$$;

alter table public.iniciativa_voto_counts replica identity full;

-- ---------------------------------------------------------------------------
-- RPC pública: health / meta (para edge e UI)
-- ---------------------------------------------------------------------------
create or replace function public.platform_health()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'iniciativas', (select count(*) from public.iniciativas),
    'cidadaos', (select count(*) from public.profiles),
    'votos', (select coalesce(sum(favor + contra + abstencao), 0) from public.iniciativa_voto_counts),
    'last_ar_sync', (
      select jsonb_build_object(
        'id', id,
        'status', status,
        'finished_at', finished_at,
        'upserted', upserted
      )
      from public.ar_sync_runs
      order by started_at desc
      limit 1
    )
  );
$$;

grant execute on function public.platform_health() to anon, authenticated;

-- Upsert de iniciativa (só service_role — edge AR). Clients não têm grant.
create or replace function public.upsert_iniciativa_from_ar(p jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  -- service_role bypassa RLS; authenticated não deve chamar isto
  if auth.role() is distinct from 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    -- em hosted, service_role JWT tem role service_role
    if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  end if;

  v_id := p ->> 'id';
  if v_id is null or v_id = '' then
    raise exception 'ID_REQUIRED';
  end if;

  insert into public.iniciativas (
    id, id_oficial, titulo, tipo, legislatura, numero, autores,
    data_entrada, data_votacao, estado, tema,
    descricao_oficial, explicacao, links, resultado_partidos,
    source, last_synced_at, updated_at
  )
  values (
    v_id,
    coalesce(p ->> 'id_oficial', v_id),
    coalesce(p ->> 'titulo', ''),
    coalesce(p ->> 'tipo', 'Outro'),
    coalesce(p ->> 'legislatura', ''),
    nullif(p ->> 'numero', '')::integer,
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'autores', '[]'::jsonb)) t(x)),
      '{}'::text[]
    ),
    nullif(p ->> 'data_entrada', '')::date,
    nullif(p ->> 'data_votacao', '')::date,
    coalesce((p ->> 'estado')::public.iniciativa_estado, 'em_discussao'),
    coalesce(p ->> 'tema', 'Instituições'),
    coalesce(p ->> 'descricao_oficial', ''),
    coalesce(p ->> 'explicacao', ''),
    coalesce(p -> 'links', '[]'::jsonb),
    coalesce(p -> 'resultado_partidos', '{}'::jsonb),
    'ar_dados_abertos',
    now(),
    now()
  )
  on conflict (id) do update set
    id_oficial = excluded.id_oficial,
    titulo = excluded.titulo,
    tipo = excluded.tipo,
    legislatura = excluded.legislatura,
    numero = excluded.numero,
    autores = excluded.autores,
    data_entrada = excluded.data_entrada,
    data_votacao = excluded.data_votacao,
    estado = excluded.estado,
    tema = excluded.tema,
    descricao_oficial = excluded.descricao_oficial,
    explicacao = excluded.explicacao,
    links = excluded.links,
    resultado_partidos = excluded.resultado_partidos,
    source = 'ar_dados_abertos',
    last_synced_at = now(),
    updated_at = now();

  insert into public.iniciativa_voto_counts (iniciativa_id)
  values (v_id)
  on conflict (iniciativa_id) do nothing;

  return v_id;
end;
$$;

revoke all on function public.upsert_iniciativa_from_ar(jsonb) from public;
-- apenas service_role (grant implícito via superuser; edge usa service key)
grant execute on function public.upsert_iniciativa_from_ar(jsonb) to service_role;
