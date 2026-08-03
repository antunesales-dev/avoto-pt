-- A Voto — schema inicial completo
-- Auth: Supabase Auth (auth.users)
-- Perfis, iniciativas, votos imutáveis, agregados públicos

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.voto_sentido as enum ('favor', 'contra', 'abstencao');

create type public.iniciativa_estado as enum (
  'em_discussao',
  'aprovado',
  'rejeitado',
  'arquivado'
);

-- ---------------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  cid text not null unique,
  email text not null,
  partido_preferencia text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cid_format check (cid ~ '^CID-[A-Z0-9]{6}$')
);

create index profiles_cid_idx on public.profiles (cid);

comment on table public.profiles is 'Perfil do cidadão; voto e métricas usam id/cid, não nome público.';

-- ---------------------------------------------------------------------------
-- Iniciativas (fonte: Dados Abertos AR em produção)
-- ---------------------------------------------------------------------------
create table public.iniciativas (
  id text primary key,
  id_oficial text not null,
  titulo text not null,
  tipo text not null,
  legislatura text not null,
  numero integer,
  autores text[] not null default '{}',
  data_entrada date,
  data_votacao date,
  estado public.iniciativa_estado not null default 'em_discussao',
  tema text not null,
  descricao_oficial text not null default '',
  explicacao text not null default '',
  links jsonb not null default '[]'::jsonb,
  resultado_partidos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index iniciativas_estado_idx on public.iniciativas (estado);
create index iniciativas_tema_idx on public.iniciativas (tema);
create index iniciativas_data_votacao_idx on public.iniciativas (data_votacao desc nulls last);

-- ---------------------------------------------------------------------------
-- Votos dos cidadãos — UM por (user, iniciativa); SEM UPDATE/DELETE para users
-- ---------------------------------------------------------------------------
create table public.votos_cidadaos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  iniciativa_id text not null references public.iniciativas (id) on delete cascade,
  voto public.voto_sentido not null,
  created_at timestamptz not null default now(),
  constraint votos_cidadaos_unique_user_iniciativa unique (user_id, iniciativa_id)
);

create index votos_cidadaos_iniciativa_idx on public.votos_cidadaos (iniciativa_id);
create index votos_cidadaos_user_idx on public.votos_cidadaos (user_id);

comment on table public.votos_cidadaos is 'Voto único e imutável por cidadão e iniciativa.';

-- ---------------------------------------------------------------------------
-- Agregados públicos (sem revelar quem votou)
-- ---------------------------------------------------------------------------
-- security_invoker=false: agrega com privilégios do owner (sem expor linhas de voto)
create or replace view public.iniciativa_votos_agg
with (security_invoker = false)
as
select
  v.iniciativa_id,
  count(*) filter (where v.voto = 'favor')::bigint as favor,
  count(*) filter (where v.voto = 'contra')::bigint as contra,
  count(*) filter (where v.voto = 'abstencao')::bigint as abstencao,
  count(*)::bigint as total
from public.votos_cidadaos v
group by v.iniciativa_id;

create or replace view public.metricas_globais
with (security_invoker = false)
as
select
  (select count(*)::bigint from public.profiles) as cidadaos_registados,
  (select count(*)::bigint from public.votos_cidadaos) as votos_emitidos,
  (select count(*)::bigint from public.iniciativas) as iniciativas_disponiveis,
  case
    when (select count(*) from public.profiles) = 0
      or (select count(*) from public.iniciativas) = 0
    then 0::numeric
    else round(
      (
        (select count(*)::numeric from public.votos_cidadaos)
        / (select count(*)::numeric from public.profiles)
        / (select count(*)::numeric from public.iniciativas)
      ) * 100,
      1
    )
  end as taxa_participacao_media;

-- ---------------------------------------------------------------------------
-- CID generator
-- ---------------------------------------------------------------------------
create or replace function public.generate_cid()
returns text
language plpgsql
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
-- Trigger: criar perfil ao registar (auth.users)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_cid text;
  attempts int := 0;
begin
  loop
    new_cid := public.generate_cid();
    begin
      insert into public.profiles (id, cid, email)
      values (new.id, new_cid, coalesce(new.email, ''));
      exit;
    exception
      when unique_violation then
        attempts := attempts + 1;
        if attempts > 20 then
          raise exception 'Não foi possível gerar CID único';
        end if;
    end;
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPC: registar voto (confirmação na UI; imutabilidade na BD)
-- ---------------------------------------------------------------------------
create or replace function public.cast_voto(
  p_iniciativa_id text,
  p_voto public.voto_sentido
)
returns public.votos_cidadaos
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.votos_cidadaos;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.iniciativas i where i.id = p_iniciativa_id) then
    raise exception 'INICIATIVA_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.votos_cidadaos v
    where v.user_id = uid and v.iniciativa_id = p_iniciativa_id
  ) then
    raise exception 'ALREADY_VOTED' using errcode = '23505';
  end if;

  insert into public.votos_cidadaos (user_id, iniciativa_id, voto)
  values (uid, p_iniciativa_id, p_voto)
  returning * into row;

  return row;
end;
$$;

revoke all on function public.cast_voto(text, public.voto_sentido) from public;
grant execute on function public.cast_voto(text, public.voto_sentido) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.iniciativas enable row level security;
alter table public.votos_cidadaos enable row level security;

-- Profiles: ler/editar só o próprio
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Iniciativas: leitura pública
create policy iniciativas_select_all
  on public.iniciativas for select
  to anon, authenticated
  using (true);

-- Votos: ver só os próprios; insert bloqueado (usar cast_voto); sem update/delete
create policy votos_select_own
  on public.votos_cidadaos for select
  to authenticated
  using (user_id = auth.uid());

-- Views: grant select público nos agregados
grant select on public.iniciativa_votos_agg to anon, authenticated;
grant select on public.metricas_globais to anon, authenticated;
grant select on public.iniciativas to anon, authenticated;
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

-- Impedir UPDATE/DELETE em votos para roles de app (imutabilidade)
revoke update, delete on public.votos_cidadaos from authenticated, anon;
revoke insert on public.votos_cidadaos from authenticated, anon;
