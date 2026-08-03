-- =============================================================================
-- Encriptação de dados de utilizador (PII + votos)
--
-- Camadas:
-- 1) Em repouso (disco): responsabilidade da plataforma Supabase em produção
-- 2) Em trânsito: TLS (produção)
-- 3) Ao nível da coluna (esta migration): pgcrypto + chave no Vault
--    - profiles: sem email em claro (email só em auth.users, gerido pelo Auth)
--    - partido_preferencia: ciphertext
--    - votos: ciphertext; contagens públicas em tabela separada (sem PII)
--
-- A chave NUNCA sai do servidor Postgres/Vault. O cliente só vê plaintext via
-- funções security definer que verificam auth.uid().
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Chave de encriptação no Vault (gerada se ainda não existir)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'avoto_user_data_key'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'avoto_user_data_key',
      'Chave simétrica para PII e votos dos cidadãos (A Voto). Não exportar.'
    );
  end if;
end;
$$;

create or replace function private.user_data_key()
returns text
language sql
stable
security definer
set search_path = vault, public
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'avoto_user_data_key'
  limit 1;
$$;

revoke all on function private.user_data_key() from public, anon, authenticated;

create or replace function private.encrypt_text(p_plain text)
returns bytea
language plpgsql
stable
security definer
set search_path = extensions, private, public
as $$
declare
  k text := private.user_data_key();
begin
  if p_plain is null or p_plain = '' then
    return null;
  end if;
  if k is null or k = '' then
    raise exception 'USER_DATA_KEY_MISSING';
  end if;
  return extensions.pgp_sym_encrypt(p_plain, k, 'cipher-algo=aes256');
end;
$$;

create or replace function private.decrypt_text(p_cipher bytea)
returns text
language plpgsql
stable
security definer
set search_path = extensions, private, public
as $$
declare
  k text := private.user_data_key();
begin
  if p_cipher is null then
    return null;
  end if;
  if k is null or k = '' then
    raise exception 'USER_DATA_KEY_MISSING';
  end if;
  return extensions.pgp_sym_decrypt(p_cipher, k);
end;
$$;

revoke all on function private.encrypt_text(text) from public, anon, authenticated;
revoke all on function private.decrypt_text(bytea) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles: remover email em claro; partido encriptado
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists partido_preferencia_enc bytea;

-- migrar dados legados (se existirem em claro)
update public.profiles
set partido_preferencia_enc = private.encrypt_text(partido_preferencia)
where partido_preferencia is not null
  and partido_preferencia_enc is null;

alter table public.profiles
  drop column if exists partido_preferencia;

alter table public.profiles
  drop column if exists email;

comment on column public.profiles.partido_preferencia_enc is
  'Preferência partidária opcional, encriptada (AES via pgcrypto + Vault).';
comment on table public.profiles is
  'Perfil: id + CID. Sem email em claro (email só em auth.users). PII opcional encriptada.';

-- ---------------------------------------------------------------------------
-- votos: encriptar sentido; contagens públicas sem PII
-- ---------------------------------------------------------------------------
alter table public.votos_cidadaos
  add column if not exists voto_enc bytea;

update public.votos_cidadaos
set voto_enc = private.encrypt_text(voto::text)
where voto_enc is null;

alter table public.votos_cidadaos
  alter column voto_enc set not null;

-- contadores públicos (actualizados só por cast_voto)
create table if not exists public.iniciativa_voto_counts (
  iniciativa_id text primary key references public.iniciativas (id) on delete cascade,
  favor bigint not null default 0 check (favor >= 0),
  contra bigint not null default 0 check (contra >= 0),
  abstencao bigint not null default 0 check (abstencao >= 0),
  updated_at timestamptz not null default now()
);

alter table public.iniciativa_voto_counts enable row level security;

create policy iniciativa_voto_counts_select_all
  on public.iniciativa_voto_counts for select
  to anon, authenticated
  using (true);

grant select on public.iniciativa_voto_counts to anon, authenticated;

-- inicializar contagens a partir de votos já existentes (decrypt server-side)
insert into public.iniciativa_voto_counts (iniciativa_id, favor, contra, abstencao)
select
  v.iniciativa_id,
  count(*) filter (where private.decrypt_text(v.voto_enc) = 'favor'),
  count(*) filter (where private.decrypt_text(v.voto_enc) = 'contra'),
  count(*) filter (where private.decrypt_text(v.voto_enc) = 'abstencao')
from public.votos_cidadaos v
group by v.iniciativa_id
on conflict (iniciativa_id) do update set
  favor = excluded.favor,
  contra = excluded.contra,
  abstencao = excluded.abstencao,
  updated_at = now();

-- garantir linha de contagem para cada iniciativa
insert into public.iniciativa_voto_counts (iniciativa_id)
select i.id from public.iniciativas i
on conflict (iniciativa_id) do nothing;

-- ---------------------------------------------------------------------------
-- Views públicas: só contadores (sem tocar em ciphertext de votos)
-- (dropar antes de remover coluna voto em claro)
-- ---------------------------------------------------------------------------
drop view if exists public.iniciativa_votos_agg;
drop view if exists public.metricas_globais;

-- remover coluna voto em claro
alter table public.votos_cidadaos
  drop column if exists voto;

comment on column public.votos_cidadaos.voto_enc is
  'Sentido de voto encriptado (AES). Só legível via RPC com auth.uid() = user_id.';
create view public.iniciativa_votos_agg
with (security_invoker = false)
as
select
  c.iniciativa_id,
  c.favor,
  c.contra,
  c.abstencao,
  (c.favor + c.contra + c.abstencao)::bigint as total
from public.iniciativa_voto_counts c;

grant select on public.iniciativa_votos_agg to anon, authenticated;

create view public.metricas_globais
with (security_invoker = false)
as
select
  (select count(*)::bigint from public.profiles) as cidadaos_registados,
  (select coalesce(sum(favor + contra + abstencao), 0)::bigint from public.iniciativa_voto_counts) as votos_emitidos,
  (select count(*)::bigint from public.iniciativas) as iniciativas_disponiveis,
  case
    when (select count(*) from public.profiles) = 0
      or (select count(*) from public.iniciativas) = 0
    then 0::numeric
    else round(
      (
        (select coalesce(sum(favor + contra + abstencao), 0)::numeric from public.iniciativa_voto_counts)
        / (select count(*)::numeric from public.profiles)
        / (select count(*)::numeric from public.iniciativas)
      ) * 100,
      1
    )
  end as taxa_participacao_media;

grant select on public.metricas_globais to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Trigger novo user: sem email em profiles
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
      insert into public.profiles (id, cid)
      values (new.id, new_cid);
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

-- ---------------------------------------------------------------------------
-- API segura: ler/actualizar partido (decrypt/encrypt)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_profile()
returns table (
  id uuid,
  cid text,
  partido_preferencia text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.cid,
    private.decrypt_text(p.partido_preferencia_enc) as partido_preferencia,
    p.created_at,
    p.updated_at
  from public.profiles p
  where p.id = uid;
end;
$$;

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

  update public.profiles
  set
    partido_preferencia_enc = private.encrypt_text(clean),
    updated_at = now()
  where public.profiles.id = uid;

  return query select * from public.get_my_profile();
end;
$$;

revoke all on function public.get_my_profile() from public;
revoke all on function public.update_my_partido(text) from public;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.update_my_partido(text) to authenticated;

-- ---------------------------------------------------------------------------
-- cast_voto: grava ciphertext + actualiza contadores
-- ---------------------------------------------------------------------------
drop function if exists public.cast_voto(text, public.voto_sentido);

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

  return jsonb_build_object(
    'iniciativa_id', p_iniciativa_id,
    'voto', p_voto,
    'created_at', now()
  );
end;
$$;

revoke all on function public.cast_voto(text, public.voto_sentido) from public;
grant execute on function public.cast_voto(text, public.voto_sentido) to authenticated;

-- ---------------------------------------------------------------------------
-- Ler os próprios votos (decrypt só se auth.uid = user_id)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_voto(p_iniciativa_id text)
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
  if uid is null then
    return null;
  end if;

  select v.voto_enc into cipher
  from public.votos_cidadaos v
  where v.user_id = uid and v.iniciativa_id = p_iniciativa_id;

  if cipher is null then
    return null;
  end if;

  return private.decrypt_text(cipher);
end;
$$;

create or replace function public.list_my_votos()
returns table (
  iniciativa_id text,
  voto text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    v.iniciativa_id,
    private.decrypt_text(v.voto_enc) as voto,
    v.created_at
  from public.votos_cidadaos v
  where v.user_id = uid
  order by v.created_at desc;
end;
$$;

revoke all on function public.get_my_voto(text) from public;
revoke all on function public.list_my_votos() from public;
grant execute on function public.get_my_voto(text) to authenticated;
grant execute on function public.list_my_votos() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: profiles — cliente NÃO lê colunas encriptadas em bruto com sentido
-- (só via get_my_profile). Mantém select own para cid/timestamps.
-- Bloquear select directo de voto_enc: já só own rows; ciphertext inútil sem chave.
-- ---------------------------------------------------------------------------
-- Impedir update directo a partido_preferencia_enc (só RPC)
revoke update on public.profiles from authenticated;
grant update (updated_at) on public.profiles to authenticated;

-- Na prática o update de partido é só via update_my_partido.
-- Clientes autenticados podem ler a própria linha (veem ciphertext inútil sem key no client).
-- Preferível: policy que só expõe via RPC — PostgREST devolve a linha completa se select own.
-- Mitigação: revoke select on partido_preferencia_enc não é possível por coluna no PG facilmente.
-- Usamos view segura:

create or replace view public.my_profile_safe
with (security_invoker = true)
as
select
  p.id,
  p.cid,
  p.created_at,
  p.updated_at
from public.profiles p
where p.id = auth.uid();

grant select on public.my_profile_safe to authenticated;

-- Opcional: revogar select em profiles para authenticated e forçar RPC
-- (mantém service_role / owner)
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_no_direct_select
  on public.profiles for select
  to authenticated
  using (false);

-- writes só via trigger / RPC security definer (bypass RLS como owner)
create policy profiles_no_direct_insert
  on public.profiles for insert
  to authenticated
  with check (false);

create policy profiles_no_direct_update
  on public.profiles for update
  to authenticated
  using (false)
  with check (false);

-- votos: sem acesso directo (só list_my_votos / get_my_voto / cast_voto)
drop policy if exists votos_select_own on public.votos_cidadaos;

create policy votos_no_direct_select
  on public.votos_cidadaos for select
  to authenticated
  using (false);

create policy votos_no_direct_insert
  on public.votos_cidadaos for insert
  to authenticated
  with check (false);

create policy votos_no_direct_update
  on public.votos_cidadaos for update
  to authenticated
  using (false)
  with check (false);

create policy votos_no_direct_delete
  on public.votos_cidadaos for delete
  to authenticated
  using (false);
