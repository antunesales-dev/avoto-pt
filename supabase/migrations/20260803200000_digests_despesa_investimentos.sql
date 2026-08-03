-- =============================================================================
-- Digests diários (AR) · Despesa pública · Investimentos (voto cidadão)
-- Fontes: apenas portais oficiais (.gov.pt / parlamento.pt) — nunca notícias
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Digest diário: o que foi a voto / como votaram (agregado factual)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_digests (
  id text primary key, -- YYYY-MM-DD
  digest_date date not null unique,
  title text not null,
  summary text not null default '',
  source_urls jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  -- items[]: { iniciativa_id, id_oficial, titulo, resultado_ar, resultado_partidos, votos_cidadaos? }
  generated_at timestamptz not null default now(),
  source text not null default 'ar_dados_abertos'
);

create index if not exists daily_digests_date_idx on public.daily_digests (digest_date desc);

alter table public.daily_digests enable row level security;

create policy daily_digests_select_all
  on public.daily_digests for select
  to anon, authenticated
  using (true);

create policy daily_digests_no_client_write
  on public.daily_digests for insert to anon, authenticated with check (false);

create policy daily_digests_no_client_update
  on public.daily_digests for update to anon, authenticated using (false) with check (false);

create policy daily_digests_no_client_delete
  on public.daily_digests for delete to anon, authenticated using (false);

grant select on public.daily_digests to anon, authenticated;

comment on table public.daily_digests is
  'Resumo diário factual de votações AR + comparação com votos cidadãos (se existirem).';

-- ---------------------------------------------------------------------------
-- Despesa / contratos / linhas orçamentais (transparência de spending)
-- ---------------------------------------------------------------------------
create type public.despesa_tipo as enum (
  'contrato_publico',
  'orcamento_linha',
  'investimento_publico',
  'outro'
);

create table if not exists public.despesas_publicas (
  id text primary key,
  tipo public.despesa_tipo not null default 'contrato_publico',
  titulo text not null,
  entidade text not null default '',
  montante_eur numeric(18, 2) null,
  moeda text not null default 'EUR',
  data_publicacao date null,
  data_inicio date null,
  data_fim date null,
  descricao text not null default '',
  categoria text not null default '',
  links jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  source text not null default 'seed',
  source_id text null,
  last_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists despesas_publicas_data_idx
  on public.despesas_publicas (data_publicacao desc nulls last);
create index if not exists despesas_publicas_tipo_idx on public.despesas_publicas (tipo);
create index if not exists despesas_publicas_montante_idx
  on public.despesas_publicas (montante_eur desc nulls last);

alter table public.despesas_publicas enable row level security;

create policy despesas_select_all
  on public.despesas_publicas for select to anon, authenticated using (true);
create policy despesas_no_insert
  on public.despesas_publicas for insert to anon, authenticated with check (false);
create policy despesas_no_update
  on public.despesas_publicas for update to anon, authenticated using (false) with check (false);
create policy despesas_no_delete
  on public.despesas_publicas for delete to anon, authenticated using (false);

grant select on public.despesas_publicas to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Investimentos: itens em que o cidadão vota (aprovar / rejeitar / abster)
-- Compara com decisão oficial quando existir (governo/AR)
-- ---------------------------------------------------------------------------
create type public.decisao_oficial as enum (
  'aprovado',
  'rejeitado',
  'em_curso',
  'nao_aplicavel',
  'desconhecido'
);

create table if not exists public.investimentos (
  id text primary key,
  titulo text not null,
  descricao text not null default '',
  montante_eur numeric(18, 2) null,
  entidade text not null default '',
  sector text not null default '',
  data_referencia date null,
  decisao_oficial public.decisao_oficial not null default 'desconhecido',
  decisao_detalhe text not null default '',
  despesa_id text null references public.despesas_publicas (id) on delete set null,
  links jsonb not null default '[]'::jsonb,
  source text not null default 'seed',
  last_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investimentos_sector_idx on public.investimentos (sector);
create index if not exists investimentos_montante_idx
  on public.investimentos (montante_eur desc nulls last);

alter table public.investimentos enable row level security;

create policy investimentos_select_all
  on public.investimentos for select to anon, authenticated using (true);
create policy investimentos_no_insert
  on public.investimentos for insert to anon, authenticated with check (false);
create policy investimentos_no_update
  on public.investimentos for update to anon, authenticated using (false) with check (false);
create policy investimentos_no_delete
  on public.investimentos for delete to anon, authenticated using (false);

grant select on public.investimentos to anon, authenticated;

-- Contagens de votos cidadãos (público, sem PII)
create table if not exists public.investimento_voto_counts (
  investimento_id text primary key references public.investimentos (id) on delete cascade,
  favor bigint not null default 0 check (favor >= 0),
  contra bigint not null default 0 check (contra >= 0),
  abstencao bigint not null default 0 check (abstencao >= 0),
  updated_at timestamptz not null default now()
);

alter table public.investimento_voto_counts enable row level security;

create policy inv_counts_select
  on public.investimento_voto_counts for select to anon, authenticated using (true);
create policy inv_counts_no_write_i
  on public.investimento_voto_counts for insert to anon, authenticated with check (false);
create policy inv_counts_no_write_u
  on public.investimento_voto_counts for update to anon, authenticated using (false) with check (false);
create policy inv_counts_no_write_d
  on public.investimento_voto_counts for delete to anon, authenticated using (false);

grant select on public.investimento_voto_counts to anon, authenticated;

-- Votos encriptados (mesmo padrão que iniciativas)
create table if not exists public.votos_investimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  investimento_id text not null references public.investimentos (id) on delete cascade,
  voto_enc bytea not null,
  created_at timestamptz not null default now(),
  constraint votos_investimentos_unique unique (user_id, investimento_id)
);

create index if not exists votos_investimentos_inv_idx
  on public.votos_investimentos (investimento_id);

alter table public.votos_investimentos enable row level security;

create policy votos_inv_no_select
  on public.votos_investimentos for select to authenticated using (false);
create policy votos_inv_no_insert
  on public.votos_investimentos for insert to authenticated with check (false);
create policy votos_inv_no_update
  on public.votos_investimentos for update to authenticated using (false) with check (false);
create policy votos_inv_no_delete
  on public.votos_investimentos for delete to authenticated using (false);

-- View agregada
create or replace view public.investimento_votos_agg
with (security_invoker = false)
as
select
  c.investimento_id,
  c.favor,
  c.contra,
  c.abstencao,
  (c.favor + c.contra + c.abstencao)::bigint as total
from public.investimento_voto_counts c;

grant select on public.investimento_votos_agg to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPCs voto investimento (rate limit + encrypt + imutável)
-- ---------------------------------------------------------------------------
create or replace function public.cast_voto_investimento(
  p_investimento_id text,
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

  insert into public.investimento_voto_counts (investimento_id, favor, contra, abstencao)
  values (
    p_investimento_id,
    case when p_voto = 'favor' then 1 else 0 end,
    case when p_voto = 'contra' then 1 else 0 end,
    case when p_voto = 'abstencao' then 1 else 0 end
  )
  on conflict (investimento_id) do update set
    favor = public.investimento_voto_counts.favor
      + case when p_voto = 'favor' then 1 else 0 end,
    contra = public.investimento_voto_counts.contra
      + case when p_voto = 'contra' then 1 else 0 end,
    abstencao = public.investimento_voto_counts.abstencao
      + case when p_voto = 'abstencao' then 1 else 0 end,
    updated_at = now();

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

revoke all on function public.cast_voto_investimento(text, public.voto_sentido) from public;
grant execute on function public.cast_voto_investimento(text, public.voto_sentido) to authenticated;

create or replace function public.get_my_voto_investimento(p_investimento_id text)
returns text
language plpgsql
stable
security definer
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

grant execute on function public.get_my_voto_investimento(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Gerar digest diário a partir de iniciativas (chamável por edge / service)
-- ---------------------------------------------------------------------------
create or replace function public.generate_daily_digest(p_date date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := to_char(p_date, 'YYYY-MM-DD');
  v_items jsonb;
  v_count integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by item ->> 'id_oficial'), '[]'::jsonb), count(*)
  into v_items, v_count
  from (
    select jsonb_build_object(
      'iniciativa_id', i.id,
      'id_oficial', i.id_oficial,
      'titulo', i.titulo,
      'tipo', i.tipo,
      'estado', i.estado,
      'resultado_partidos', i.resultado_partidos,
      'votos_cidadaos', jsonb_build_object(
        'favor', coalesce(c.favor, 0),
        'contra', coalesce(c.contra, 0),
        'abstencao', coalesce(c.abstencao, 0)
      )
    ) as item
    from public.iniciativas i
    left join public.iniciativa_voto_counts c on c.iniciativa_id = i.id
    where i.data_votacao = p_date
       or (i.data_votacao is null and i.updated_at::date = p_date)
  ) t;

  insert into public.daily_digests (id, digest_date, title, summary, source_urls, items, generated_at, source)
  values (
    v_id,
    p_date,
    'Digest ' || v_id,
    case
      when v_count = 0 then 'Sem votações com data de referência neste dia nos dados disponíveis.'
      when v_count = 1 then '1 iniciativa com actividade registada neste dia.'
      else v_count::text || ' iniciativas com actividade registada neste dia.'
    end,
    jsonb_build_array(
      jsonb_build_object(
        'label', 'Dados Abertos da Assembleia da República',
        'url', 'https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx'
      )
    ),
    coalesce(v_items, '[]'::jsonb),
    now(),
    'ar_dados_abertos'
  )
  on conflict (id) do update set
    title = excluded.title,
    summary = excluded.summary,
    source_urls = excluded.source_urls,
    items = excluded.items,
    generated_at = now(),
    source = excluded.source;

  return v_id;
end;
$$;

revoke all on function public.generate_daily_digest(date) from public;
grant execute on function public.generate_daily_digest(date) to service_role;

-- Upsert despesa (service_role)
create or replace function public.upsert_despesa_publica(p jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_id := p ->> 'id';
  if v_id is null or v_id = '' then
    raise exception 'ID_REQUIRED';
  end if;

  insert into public.despesas_publicas (
    id, tipo, titulo, entidade, montante_eur, moeda,
    data_publicacao, data_inicio, data_fim, descricao, categoria,
    links, meta, source, source_id, last_synced_at, updated_at
  ) values (
    v_id,
    coalesce((p ->> 'tipo')::public.despesa_tipo, 'contrato_publico'),
    coalesce(p ->> 'titulo', ''),
    coalesce(p ->> 'entidade', ''),
    nullif(p ->> 'montante_eur', '')::numeric,
    coalesce(p ->> 'moeda', 'EUR'),
    nullif(p ->> 'data_publicacao', '')::date,
    nullif(p ->> 'data_inicio', '')::date,
    nullif(p ->> 'data_fim', '')::date,
    coalesce(p ->> 'descricao', ''),
    coalesce(p ->> 'categoria', ''),
    coalesce(p -> 'links', '[]'::jsonb),
    coalesce(p -> 'meta', '{}'::jsonb),
    coalesce(p ->> 'source', 'oficial'),
    p ->> 'source_id',
    now(),
    now()
  )
  on conflict (id) do update set
    tipo = excluded.tipo,
    titulo = excluded.titulo,
    entidade = excluded.entidade,
    montante_eur = excluded.montante_eur,
    moeda = excluded.moeda,
    data_publicacao = excluded.data_publicacao,
    data_inicio = excluded.data_inicio,
    data_fim = excluded.data_fim,
    descricao = excluded.descricao,
    categoria = excluded.categoria,
    links = excluded.links,
    meta = excluded.meta,
    source = excluded.source,
    source_id = excluded.source_id,
    last_synced_at = now(),
    updated_at = now();

  return v_id;
end;
$$;

revoke all on function public.upsert_despesa_publica(jsonb) from public;
grant execute on function public.upsert_despesa_publica(jsonb) to service_role;

create or replace function public.upsert_investimento(p jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_id := p ->> 'id';
  if v_id is null or v_id = '' then
    raise exception 'ID_REQUIRED';
  end if;

  insert into public.investimentos (
    id, titulo, descricao, montante_eur, entidade, sector,
    data_referencia, decisao_oficial, decisao_detalhe, despesa_id,
    links, source, last_synced_at, updated_at
  ) values (
    v_id,
    coalesce(p ->> 'titulo', ''),
    coalesce(p ->> 'descricao', ''),
    nullif(p ->> 'montante_eur', '')::numeric,
    coalesce(p ->> 'entidade', ''),
    coalesce(p ->> 'sector', ''),
    nullif(p ->> 'data_referencia', '')::date,
    coalesce((p ->> 'decisao_oficial')::public.decisao_oficial, 'desconhecido'),
    coalesce(p ->> 'decisao_detalhe', ''),
    nullif(p ->> 'despesa_id', ''),
    coalesce(p -> 'links', '[]'::jsonb),
    coalesce(p ->> 'source', 'oficial'),
    now(),
    now()
  )
  on conflict (id) do update set
    titulo = excluded.titulo,
    descricao = excluded.descricao,
    montante_eur = excluded.montante_eur,
    entidade = excluded.entidade,
    sector = excluded.sector,
    data_referencia = excluded.data_referencia,
    decisao_oficial = excluded.decisao_oficial,
    decisao_detalhe = excluded.decisao_detalhe,
    despesa_id = excluded.despesa_id,
    links = excluded.links,
    source = excluded.source,
    last_synced_at = now(),
    updated_at = now();

  insert into public.investimento_voto_counts (investimento_id)
  values (v_id)
  on conflict (investimento_id) do nothing;

  return v_id;
end;
$$;

revoke all on function public.upsert_investimento(jsonb) from public;
grant execute on function public.upsert_investimento(jsonb) to service_role;

-- Realtime contagens investimentos
do $$
begin
  begin
    alter publication supabase_realtime add table public.investimento_voto_counts;
  exception when others then null;
  end;
end;
$$;

alter table public.investimento_voto_counts replica identity full;

-- Métricas estendidas
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
