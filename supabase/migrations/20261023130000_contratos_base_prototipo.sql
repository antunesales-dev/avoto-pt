-- =============================================================================
-- PROTÓTIPO (passo 13 do plano): Portal Base COMPLETO (todas as entidades
-- públicas, não só a saúde), a partir do dataset oficial do IMPIC em dados.gov.pt
-- ("Contratos Públicos - Portal Base - IMPIC - Contratos de 2012 a 2026",
-- atualização semanal, licença de domínio público).
--
-- Tabelas NOVAS, separadas de despesas_publicas: não muda nada no site atual.
-- Chave = idcontrato oficial do Portal Base (estável, com link direto ao detalhe),
-- ao contrário do dataset SNS, que não expõe id e obrigou ao hash.
-- Carregamento: scripts/ingest-portal-base.mjs (service_role).
-- =============================================================================

create table if not exists public.contratos_base (
  id text primary key,                         -- idcontrato (Portal Base)
  id_procedimento text null,
  objeto text not null default '',
  descricao text not null default '',
  tipos_contrato text[] not null default '{}',
  tipo_procedimento text not null default '',
  adjudicante_nif text null,
  adjudicante_nome text not null default '',
  adjudicatarios jsonb not null default '[]'::jsonb,   -- [{ "nif": "...", "nome": "..." }]
  preco_contratual numeric(18, 2) null,
  preco_base numeric(18, 2) null,
  preco_total_efetivo numeric(18, 2) null,
  data_publicacao date null,
  data_celebracao date null,
  data_decisao date null,
  data_fecho date null,
  prazo_execucao_dias integer null,
  cpv jsonb not null default '[]'::jsonb,              -- [{ "codigo": "...", "descricao": "..." }]
  local_execucao text[] not null default '{}',
  fundamentacao text not null default '',
  procedimento_centralizado boolean null,
  acordo_quadro text not null default '',
  n_anuncio text not null default '',
  contrato_ecologico boolean null,
  ano integer null,
  url_base text generated always as
    ('https://www.base.gov.pt/Base4/pt/detalhe/?type=contratos&id=' || id) stored,
  fonte_ficheiro text not null default '',
  synced_at timestamptz not null default now()
);

comment on table public.contratos_base is
  'PROTÓTIPO: contratos do Portal Base (IMPIC, dados.gov.pt), todas as entidades. id = idcontrato oficial.';

create index if not exists contratos_base_adjudicante_idx on public.contratos_base (adjudicante_nif);
create index if not exists contratos_base_data_pub_idx on public.contratos_base (data_publicacao desc nulls last);
create index if not exists contratos_base_preco_idx on public.contratos_base (preco_contratual desc nulls last);
create index if not exists contratos_base_cpv_gin on public.contratos_base using gin (cpv jsonb_path_ops);

alter table public.contratos_base enable row level security;
drop policy if exists contratos_base_select_all on public.contratos_base;
create policy contratos_base_select_all on public.contratos_base for select to anon, authenticated using (true);
grant select on public.contratos_base to anon, authenticated;
grant all on public.contratos_base to service_role;

-- Entidades adjudicantes (agregado refrescado no fim de cada ingestão)
create table if not exists public.entidades_publicas (
  nif text primary key,
  nome text not null,
  n_contratos integer not null default 0,
  total_eur numeric(18, 2) not null default 0,
  ultimo_contrato date null,
  updated_at timestamptz not null default now()
);

alter table public.entidades_publicas enable row level security;
drop policy if exists entidades_publicas_select_all on public.entidades_publicas;
create policy entidades_publicas_select_all on public.entidades_publicas for select to anon, authenticated using (true);
grant select on public.entidades_publicas to anon, authenticated;
grant all on public.entidades_publicas to service_role;

create or replace function public.refresh_entidades_publicas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.entidades_publicas (nif, nome, n_contratos, total_eur, ultimo_contrato, updated_at)
  select c.adjudicante_nif,
         (array_agg(c.adjudicante_nome order by c.data_publicacao desc nulls last))[1],
         count(*)::int,
         coalesce(sum(c.preco_contratual), 0),
         max(c.data_publicacao),
         now()
  from public.contratos_base c
  where c.adjudicante_nif is not null
  group by c.adjudicante_nif
  on conflict (nif) do update set
    nome = excluded.nome,
    n_contratos = excluded.n_contratos,
    total_eur = excluded.total_eur,
    ultimo_contrato = excluded.ultimo_contrato,
    updated_at = now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.refresh_entidades_publicas() from public, anon, authenticated;
grant execute on function public.refresh_entidades_publicas() to service_role;

-- Ponte com a Despesa atual (SNS): permite, mais tarde, trocar o id hash pelo idcontrato.
create or replace view public.despesa_contrato_base
with (security_invoker = true)
as
select d.id as despesa_id, c.id as contrato_base_id, c.url_base
from public.despesas_publicas d
join public.contratos_base c
  on c.adjudicante_nif = d.entidade_nif
 and c.preco_contratual = d.montante_eur
 and c.data_publicacao is not distinct from d.data_publicacao
 and c.data_celebracao is not distinct from d.data_inicio
 and public.despesa_titulo_key(c.objeto) = public.despesa_titulo_key(d.titulo);

grant select on public.despesa_contrato_base to anon, authenticated;
