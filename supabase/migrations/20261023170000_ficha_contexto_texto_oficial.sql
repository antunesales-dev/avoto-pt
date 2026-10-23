-- Ficha da iniciativa com mais contexto (todo ele de fontes oficiais da AR).
--  1) Colunas novas vindas do JSON dos Dados Abertos (sync-ar.mjs / ar-mapper.js):
--     petições associadas, iniciativas de origem / originadas, aviso de texto substituído.
--     (A apreciação pública e as datas das audições vão dentro de `comissao`, que já é jsonb.)
--  2) `iniciativa_textos`: excertos LITERAIS do texto oficial (IniLinkTexto) — exposição de motivos,
--     objeto (Artigo 1.º), articulado e parte dispositiva — preenchida por scripts/extract-textos-ar.mjs.
--     Tabela à parte para a lista (/iniciativas) não carregar texto e o upsert do sync nunca o apagar.
--  3) `iniciativas_relacionadas(id)`: outras iniciativas do mesmo tema com título semelhante (pg_trgm).
-- Idempotente. Ordem de rollout: esta migração → sync AR → extract-textos-ar (backfill em lotes).

-- 1) Colunas ------------------------------------------------------------------------------
alter table public.iniciativas
  add column if not exists peticoes jsonb not null default '[]'::jsonb,
  add column if not exists iniciativas_origem jsonb not null default '[]'::jsonb,
  add column if not exists iniciativas_originadas jsonb not null default '[]'::jsonb,
  add column if not exists texto_substituido text;

comment on column public.iniciativas.peticoes is 'Petições associadas [{id, numero, legislatura, assunto, url, conjunta}] (Peticoes + PeticoesConjuntas da AR).';
comment on column public.iniciativas.iniciativas_origem is 'Iniciativas que deram origem a esta [{ar_ini_id, id_oficial, iniciativa_id, tipo, titulo}] (IniciativasOrigem).';
comment on column public.iniciativas.iniciativas_originadas is 'Iniciativas originadas por esta [{ar_ini_id, id_oficial, iniciativa_id, tipo, titulo}] (IniciativasOriginadas).';
comment on column public.iniciativas.texto_substituido is 'Nota da AR quando o texto foi substituído (IniTextoSubst = SIM / IniTextoSubstCampo).';

-- Upsert com as colunas novas (o resto igual a 20261023120000) -----------------------------
create or replace function public.upsert_iniciativa_from_ar(p jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if auth.role() is distinct from 'service_role' and current_user not in ('postgres', 'supabase_admin') then
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
    ar_ini_id, autores_deputados, tema_fonte, votacao_principal,
    fases, votacoes, documentos, comissao, debates, conjuntas, procedimento, dossie_id,
    peticoes, iniciativas_origem, iniciativas_originadas, texto_substituido,
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
    coalesce(p ->> 'tema', 'Outros'),
    coalesce(p ->> 'descricao_oficial', ''),
    coalesce(p ->> 'explicacao', ''),
    coalesce(p -> 'links', '[]'::jsonb),
    coalesce(p -> 'resultado_partidos', '{}'::jsonb),
    p ->> 'ar_ini_id',
    coalesce(p -> 'autores_deputados', '[]'::jsonb),
    p ->> 'tema_fonte',
    nullif(p -> 'votacao_principal', 'null'::jsonb),
    coalesce(p -> 'fases', '[]'::jsonb),
    coalesce(p -> 'votacoes', '[]'::jsonb),
    coalesce(p -> 'documentos', '[]'::jsonb),
    nullif(p -> 'comissao', 'null'::jsonb),
    coalesce(p -> 'debates', '[]'::jsonb),
    coalesce(p -> 'conjuntas', '[]'::jsonb),
    coalesce((p ->> 'procedimento')::boolean, false),
    p ->> 'dossie_id',
    coalesce(p -> 'peticoes', '[]'::jsonb),
    coalesce(p -> 'iniciativas_origem', '[]'::jsonb),
    coalesce(p -> 'iniciativas_originadas', '[]'::jsonb),
    p ->> 'texto_substituido',
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
    ar_ini_id = coalesce(excluded.ar_ini_id, iniciativas.ar_ini_id),
    autores_deputados = excluded.autores_deputados,
    tema_fonte = excluded.tema_fonte,
    votacao_principal = excluded.votacao_principal,
    fases = excluded.fases,
    votacoes = excluded.votacoes,
    documentos = excluded.documentos,
    comissao = excluded.comissao,
    debates = excluded.debates,
    conjuntas = excluded.conjuntas,
    procedimento = excluded.procedimento,
    -- payloads parciais (edge ar-sync) não trazem dossie_id: manter o que existe
    dossie_id = case when p ? 'dossie_id' then excluded.dossie_id else iniciativas.dossie_id end,
    -- payloads antigos/parciais (sem as chaves novas) não apagam o contexto já guardado
    peticoes = case when p ? 'peticoes' then excluded.peticoes else iniciativas.peticoes end,
    iniciativas_origem = case when p ? 'iniciativas_origem' then excluded.iniciativas_origem else iniciativas.iniciativas_origem end,
    iniciativas_originadas = case when p ? 'iniciativas_originadas' then excluded.iniciativas_originadas else iniciativas.iniciativas_originadas end,
    texto_substituido = case when p ? 'texto_substituido' then excluded.texto_substituido else iniciativas.texto_substituido end,
    source = 'ar_dados_abertos',
    last_synced_at = now(),
    updated_at = now();

  insert into public.iniciativa_voto_counts (iniciativa_id)
  values (v_id)
  on conflict (iniciativa_id) do nothing;

  return v_id;
end;
$$;

revoke all on function public.upsert_iniciativa_from_ar(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_iniciativa_from_ar(jsonb) to service_role;

-- 2) Texto oficial (excertos literais) -------------------------------------------------------
create table if not exists public.iniciativa_textos (
  iniciativa_id text primary key references public.iniciativas (id) on delete cascade,
  fonte_url text,
  formato text,
  sha256 text,
  estado text not null check (estado in ('ok', 'sem_estrutura', 'vazio', 'erro', 'sem_texto')),
  versao integer not null default 1,
  exposicao jsonb not null default '[]'::jsonb,
  objeto text,
  artigos jsonb not null default '[]'::jsonb,
  dispositivo jsonb not null default '[]'::jsonb,
  transicao text,
  n_paragrafos integer not null default 0,
  erro text,
  extraido_em timestamptz not null default now()
);

comment on table public.iniciativa_textos is
  'Excertos literais do texto oficial da iniciativa (IniLinkTexto da AR), extraídos de forma determinística por scripts/extract-textos-ar.mjs. Nunca resumos gerados: a UI mostra sempre a fonte (fonte_url).';
comment on column public.iniciativa_textos.exposicao is 'Parágrafos iniciais da Exposição de motivos / nota justificativa, por ordem (texto integral de cada parágrafo, cortado só se > 3000 caracteres).';
comment on column public.iniciativa_textos.objeto is 'Corpo do Artigo 1.º (normalmente “Objeto”).';
comment on column public.iniciativa_textos.artigos is 'Articulado de topo [{n, epigrafe}].';
comment on column public.iniciativa_textos.dispositivo is 'Parte dispositiva de resoluções/deliberações (o que se recomenda ou decide).';
comment on column public.iniciativa_textos.transicao is 'Parágrafo literal que introduz a parte dispositiva (ex.: “… recomenda ao Governo que:”).';

alter table public.iniciativa_textos enable row level security;

drop policy if exists iniciativa_textos_select on public.iniciativa_textos;
create policy iniciativa_textos_select
  on public.iniciativa_textos for select to anon, authenticated
  using (estado = 'ok');
drop policy if exists iniciativa_textos_no_i on public.iniciativa_textos;
create policy iniciativa_textos_no_i
  on public.iniciativa_textos for insert to anon, authenticated with check (false);
drop policy if exists iniciativa_textos_no_u on public.iniciativa_textos;
create policy iniciativa_textos_no_u
  on public.iniciativa_textos for update to anon, authenticated using (false) with check (false);
drop policy if exists iniciativa_textos_no_d on public.iniciativa_textos;
create policy iniciativa_textos_no_d
  on public.iniciativa_textos for delete to anon, authenticated using (false);

revoke all on public.iniciativa_textos from anon, authenticated;
grant select on public.iniciativa_textos to anon, authenticated;
grant all on public.iniciativa_textos to service_role;

-- 3) Iniciativas relacionadas (mesmo tema, título semelhante) --------------------------------
-- ~2,5 mil linhas: varrimento simples com similarity() fica em poucos ms; sem índice novo.
create or replace function public.iniciativas_relacionadas(p_id text, p_limit integer default 6)
returns table (
  id text,
  id_oficial text,
  titulo text,
  tipo text,
  estado public.iniciativa_estado,
  data_entrada date,
  autores text[],
  score real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with base as (
    select i.id, i.tema, i.dossie_id, lower(i.titulo) as t
    from public.iniciativas i
    where i.id = p_id
  )
  select o.id, o.id_oficial, o.titulo, o.tipo, o.estado, o.data_entrada, o.autores,
         similarity(lower(o.titulo), b.t) as score
  from base b
  join public.iniciativas o
    on o.tema = b.tema
   and o.id <> b.id
   and not o.procedimento
   and (b.dossie_id is null or o.dossie_id is distinct from b.dossie_id)
  where similarity(lower(o.titulo), b.t) >= 0.2
  order by score desc, o.data_entrada desc nulls last
  limit least(greatest(coalesce(p_limit, 6), 1), 12)
$$;

comment on function public.iniciativas_relacionadas(text, integer) is
  'Outras iniciativas do mesmo tema com título semelhante (pg_trgm ≥ 0.2), fora do mesmo dossiê. Só leitura.';

revoke all on function public.iniciativas_relacionadas(text, integer) from public;
grant execute on function public.iniciativas_relacionadas(text, integer) to anon, authenticated, service_role;
