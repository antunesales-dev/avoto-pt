-- Iniciativas AR: estado honesto, tema canónico, autores reais, ficha rica e dossiês.
-- Plano avoto.pt (passos 1–4, 8–10). Os dados vêm de scripts/sync-ar.mjs via
-- supabase/functions/_shared/ar-mapper.js. Ordem de deploy: aplicar ESTA migração antes
-- de correr o sync novo (o sync envia os estados novos do enum).

-- 1) Estados novos ------------------------------------------------------------
-- aprovado_generalidade: passou a generalidade, sem votação final (antes contava como “aprovado”).
-- retirado: retirada pelos proponentes.
alter type public.iniciativa_estado add value if not exists 'aprovado_generalidade';
alter type public.iniciativa_estado add value if not exists 'retirado';

-- 2) Colunas novas -------------------------------------------------------------
alter table public.iniciativas
  add column if not exists ar_ini_id text,
  add column if not exists autores_deputados jsonb not null default '[]'::jsonb,
  add column if not exists tema_fonte text,
  add column if not exists votacao_principal jsonb,
  add column if not exists fases jsonb not null default '[]'::jsonb,
  add column if not exists votacoes jsonb not null default '[]'::jsonb,
  add column if not exists documentos jsonb not null default '[]'::jsonb,
  add column if not exists comissao jsonb,
  add column if not exists debates jsonb not null default '[]'::jsonb,
  add column if not exists conjuntas jsonb not null default '[]'::jsonb,
  add column if not exists procedimento boolean not null default false,
  add column if not exists dossie_id text;

comment on column public.iniciativas.ar_ini_id is 'IniId da AR (ficha: DetalheIniciativa.aspx?BID=<ar_ini_id>).';
comment on column public.iniciativas.autores_deputados is 'Deputados proponentes [{nome, gp}] (IniAutorDeputados).';
comment on column public.iniciativas.tema_fonte is 'comissao | palavras_chave | procedimento | nenhuma | palavras_chave_legado (scripts/reclassify-temas-legacy.mjs) — de onde veio o tema.';
comment on column public.iniciativas.votacao_principal is 'Votação que define estado e resultado_partidos {id, fase, tipo, data, resultado, deputados}.';
comment on column public.iniciativas.fases is 'Percurso na AR [{data, fase, codigo, obs, dar:{tipo,numero,url}, votacao, debate}].';
comment on column public.iniciativas.votacoes is 'Todas as votações em plenário [{id, data, fase, tipo, resultado, unanime, descricao, partidos, deputados, ausencias}].';
comment on column public.iniciativas.documentos is 'Texto, anexos, pareceres e relatórios [{titulo, tipo, data, fase, url}].';
comment on column public.iniciativas.comissao is 'Comissão competente {nome, id, data_distribuicao, relatores[], pareceres_recebidos[], audicoes}.';
comment on column public.iniciativas.debates is 'Debates em plenário [{data, fase, video, dar, intervencoes:[{nome, gp, cargo, video, dar}]}].';
comment on column public.iniciativas.conjuntas is 'Iniciativas discutidas em conjunto [{ar_ini_id, id_oficial, iniciativa_id, tipo, titulo, autor}].';
comment on column public.iniciativas.procedimento is 'Procedimento interno da AR (prazos de CPI, deslocações do PR, urgências…) — oculto por defeito.';
comment on column public.iniciativas.dossie_id is 'Agrupa iniciativas discutidas em conjunto ou com título idêntico.';

create index if not exists iniciativas_dossie_idx on public.iniciativas (dossie_id) where dossie_id is not null;
create index if not exists iniciativas_procedimento_idx on public.iniciativas (procedimento);

-- 3) Temas antigos → taxonomia canónica (as linhas que o próximo sync não tocar ficam coerentes)
update public.iniciativas set tema = case tema
    when 'Educação' then 'Educação e Ciência'
    when 'Trabalho' then 'Trabalho e Segurança Social'
    when 'Ambiente' then 'Ambiente e Energia'
    when 'Agricultura' then 'Agricultura e Mar'
    when 'Justiça' then 'Justiça e Direitos'
    when 'Imigração' then 'Imigração e Nacionalidade'
    when 'Transportes' then 'Transportes e Infraestruturas'
    when 'Cultura' then 'Cultura, Juventude e Desporto'
    when 'Autarquias' then 'Estado, Autarquias e Instituições'
    when 'Instituições' then 'Estado, Autarquias e Instituições'
    when 'Direitos sociais' then 'Justiça e Direitos'
    else tema end
where tema in ('Educação', 'Trabalho', 'Ambiente', 'Agricultura', 'Justiça', 'Imigração', 'Transportes',
               'Cultura', 'Autarquias', 'Instituições', 'Direitos sociais');

-- 4) Upsert com os campos novos ----------------------------------------------------
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
