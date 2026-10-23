-- Plano de conteúdo, passos 5, 11 e 12 (workstream B).
--  5) Nomeações saem dos comunicados (tipo 'nomeacao', escondido da lista e dos digests);
--     digests de comunicados só para dias com entradas (apaga os vazios).
-- 11) Notícias do portugal.gov.pt: metadados card:tags / card:areas / card:officials / card:roles + tema.
-- 12) Ligação comunicados ↔ iniciativas (pg_trgm + janela de datas) com confirmação manual.

-- ---------------------------------------------------------------------------
-- 5) Nomeações + digests vazios
-- ---------------------------------------------------------------------------
alter table public.comunicados drop constraint if exists comunicados_tipo_check;
alter table public.comunicados
  add constraint comunicados_tipo_check
  check (tipo in ('noticia', 'comunicado_cm', 'intervencao', 'nomeacao', 'outro'));

update public.comunicados
set tipo = 'nomeacao', updated_at = now()
where url_oficial like '%/governo/nomeacoes/%' and tipo <> 'nomeacao';

-- ---------------------------------------------------------------------------
-- 11) Metadados das notícias
-- ---------------------------------------------------------------------------
alter table public.comunicados
  add column if not exists tags text[] not null default '{}',
  add column if not exists areas text[] not null default '{}',
  add column if not exists officials text[] not null default '{}',
  add column if not exists roles text[] not null default '{}',
  add column if not exists tema text;

create index if not exists comunicados_tipo_idx on public.comunicados (tipo);
create index if not exists comunicados_tema_idx on public.comunicados (tema);

comment on column public.comunicados.tags is 'card:tags do portugal.gov.pt';
comment on column public.comunicados.areas is 'card:areas (área governativa) do portugal.gov.pt';
comment on column public.comunicados.officials is 'card:officials (membros do Governo) do portugal.gov.pt';
comment on column public.comunicados.roles is 'card:roles (cargos) do portugal.gov.pt';
comment on column public.comunicados.tema is 'Tema canónico avoto derivado da área governativa (govTemas.ts).';

create or replace function public.generate_comunicados_digest(p_date date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := 'com-' || to_char(p_date, 'YYYY-MM-DD');
  v_date_pt text := to_char(p_date, 'DD/MM/YYYY');
  v_items jsonb;
  v_n integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'titulo', c.titulo,
          'resumo', left(c.resumo, 280),
          'url_oficial', c.url_oficial,
          'tipo', c.tipo,
          'tema', c.tema,
          'publicado_em', c.publicado_em
        )
        order by c.publicado_em desc, c.titulo
      ),
      '[]'::jsonb
    ),
    count(*)::integer
  into v_items, v_n
  from public.comunicados c
  where c.publicado_em = p_date
    and c.tipo <> 'nomeacao';

  -- Sem entradas: não há digest (e apaga um eventual digest vazio antigo).
  if coalesce(v_n, 0) = 0 then
    delete from public.comunicados_digests where id = v_id;
    return null;
  end if;

  insert into public.comunicados_digests (
    id, digest_date, title, summary, source_urls, items, generated_at, source
  )
  values (
    v_id,
    p_date,
    'Comunicados · ' || v_n::text
      || case when v_n = 1 then ' entrada' else ' entradas' end
      || ' · ' || v_date_pt,
    'Índice de ' || v_n::text
      || ' comunicado(s)/notícia(s) oficiais publicados em ' || v_date_pt
      || ' (portugal.gov.pt). Informação — sem voto. Ver ficha completa em Comunicados.',
    jsonb_build_array(
      jsonb_build_object('label', 'Portal do Governo — Notícias',
        'url', 'https://portugal.gov.pt/gc25/comunicacao/noticias'),
      jsonb_build_object('label', 'Comunicados do Conselho de Ministros',
        'url', 'https://portugal.gov.pt/gc25/governo/comunicados-do-conselho-de-ministros')
    ),
    jsonb_build_object(
      'count', v_n,
      'items', v_items,
      'criteria', jsonb_build_object(
        'date_field', 'publicado_em',
        'note', 'Só comunicados e notícias oficiais (sem nomeações). Sem voto. Separado do Resumo do dia AR.'
      )
    ),
    now(),
    'portugal.gov.pt'
  )
  on conflict (id) do update set
    title = excluded.title,
    summary = excluded.summary,
    source_urls = excluded.source_urls,
    items = excluded.items,
    generated_at = excluded.generated_at,
    source = excluded.source;

  return v_id;
end;
$$;

revoke all on function public.generate_comunicados_digest(date) from public;
grant execute on function public.generate_comunicados_digest(date) to service_role;

-- Limpeza: digests de dias sem entradas reais (vazios ou só com nomeações)
delete from public.comunicados_digests d
where not exists (
  select 1 from public.comunicados c
  where c.publicado_em = d.digest_date and c.tipo <> 'nomeacao'
);

-- Regenerar os restantes para retirar nomeações dos itens
do $$
declare r record;
begin
  for r in select digest_date from public.comunicados_digests loop
    perform public.generate_comunicados_digest(r.digest_date);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 12) Ligações comunicados ↔ iniciativas
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.comunicado_iniciativa (
  comunicado_id text not null references public.comunicados (id) on delete cascade,
  iniciativa_id text not null references public.iniciativas (id) on delete cascade,
  score real not null,
  metodo text not null default 'trgm_v1',
  motivo jsonb not null default '{}'::jsonb,
  -- null = proposta automática por rever; true = confirmada; false = rejeitada (escondida)
  confirmado boolean,
  confirmado_em timestamptz,
  confirmado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (comunicado_id, iniciativa_id)
);

create index if not exists comunicado_iniciativa_ini_idx
  on public.comunicado_iniciativa (iniciativa_id);

alter table public.comunicado_iniciativa enable row level security;

-- Público: confirmadas + sugestões de confiança alta (motivo.auto_alta). As restantes propostas
-- (zona de revisão) e as rejeitadas não são públicas.
create policy comunicado_iniciativa_select
  on public.comunicado_iniciativa for select to anon, authenticated
  using (
    confirmado is true
    or (confirmado is null and coalesce((motivo ->> 'auto_alta')::boolean, false))
  );
create policy comunicado_iniciativa_no_i
  on public.comunicado_iniciativa for insert to anon, authenticated with check (false);
create policy comunicado_iniciativa_no_u
  on public.comunicado_iniciativa for update to anon, authenticated using (false) with check (false);
create policy comunicado_iniciativa_no_d
  on public.comunicado_iniciativa for delete to anon, authenticated using (false);

grant select on public.comunicado_iniciativa to anon, authenticated;
grant all on public.comunicado_iniciativa to service_role;

comment on table public.comunicado_iniciativa is
  'Ligação comunicado/notícia do Governo ↔ iniciativa da AR. Proposta por semelhança (pg_trgm) e datas; confirmado = revisão manual.';

-- "17 de julho" — para detetar no texto a data de entrada/votação da iniciativa.
create or replace function public.pt_dia_mes(p date)
returns text
language sql
immutable
set search_path = public
as $$
  select extract(day from p)::int::text || ' de ' ||
    (array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto',
           'setembro','outubro','novembro','dezembro'])[extract(month from p)::int]
$$;

-- Tokens de conteúdo para a ligação: minúsculas sem acentos, prefixo de 5 letras
-- (imóvel/imóveis → "imove"), sem palavras de formulário legislativo nem palavras vazias.
create or replace function public.ligacao_tokens(p text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(distinct t), '{}')
  from (
    select case when length(w) >= 5 then left(w, 5) else w end as t
    from regexp_split_to_table(
      translate(lower(coalesce(p, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
      '[^a-z0-9]+') as w
    where length(w) >= 4
  ) x
  where t <> all (array['2024','2025','2026','abril','acord','agost','ainda','alter','ambit','anexo','anos','apena','apoio','aprov','areas','artig','assem','assim','atrav','autor','cada','cidad','codig','como','conse','contr','criac','decre','demai','desta','deste','deve','devem','dezem','dias','diplo','direi','efeit','entre','esta','estab','estad','estas','este','estes','execu','fever','forma','garan','gerai','geral','gover','imple','janei','julho','junho','jurid','lista','maio','mais','marco','medid','minis','modo','nacio','neces','nova','novas','novem','novo','novos','objet','outra','outro','outub','pais','para','parla','pela','pelas','pelo','pelos','pesso','pode','podem','portu','prazo','previ','proce','proje','promo','propo','publi','quais','qual','quand','recom','refor','regim','relat','repub','respe','secto','sempr','sendo','servi','setem','setor','siste','situa','sobre','tambe','tendo','termo','toda','todas','todo','todos','vista'])
$$;

/**
 * Propõe ligações para comunicados publicados desde p_since.
 * Candidatas: iniciativas com entrada entre (data − p_dias_antes) e (data + p_dias_depois),
 * ou votadas a ±p_dias_voto da data.
 * Sinais (0..1):
 *   - sobreposição de tokens do título da iniciativa com o “lead” do comunicado
 *     (título + resumo + tags + 2 primeiros parágrafos) e com o corpo, pesada por IDF
 *     (palavras raras valem mais) e por força absoluta (≥ ~2 palavras raras);
 *   - pg_trgm: similarity(título comunicado, título iniciativa);
 *   - bónus: iniciativa do Governo (+0,10), texto fala do Parlamento (+0,05),
 *     texto cita o dia da votação (“17 de julho”, +0,10).
 * Grava as ≥ p_min (máx. p_top por comunicado) sem tocar nas já revistas (confirmado não nulo).
 * As ≥ p_auto ficam com motivo.auto_alta = true (a app mostra-as como sugestão; continuam por confirmar).
 */
create or replace function public.propose_comunicado_links(
  p_since date default current_date - 14,
  p_min real default 0.5,
  p_top int default 3,
  p_dias_antes int default 270,
  p_dias_depois int default 45,
  p_dias_voto int default 60,
  p_auto real default 0.65
)
returns table (comunicados int, propostas int, novas int)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_com int;
  v_prop int;
  v_new int;
  v_n real;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- permite várias chamadas na mesma transação
  drop table if exists _com, _ini, _df, _iw, _cands;

  create temporary table _com on commit drop as
  select c.id, c.publicado_em, lower(c.titulo) as t,
    public.ligacao_tokens(
      c.titulo || ' ' || c.resumo || ' ' || array_to_string(c.tags, ' ') || ' ' ||
      array_to_string((regexp_split_to_array(c.corpo, '\n\s*\n'))[1:2], ' ')
    ) as tok_lead,
    public.ligacao_tokens(c.corpo) as tok_body,
    (c.corpo ~* '(parlamento|assembleia da rep|proposta de lei|projeto de lei|vota[cç])') as leg,
    array(
      select distinct m[1]
      from regexp_matches(lower(c.corpo),
        '(\d{1,2} de (?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))', 'g') m
    ) as datas
  from public.comunicados c
  where c.publicado_em >= p_since
    and c.tipo in ('noticia', 'comunicado_cm', 'intervencao');

  create temporary table _ini on commit drop as
  select i.id, i.titulo, i.autores, i.tipo, i.data_entrada, i.data_votacao,
    public.ligacao_tokens(i.titulo) as tok
  from public.iniciativas i
  -- Integração com o plano A: procedimentos internos da AR (prazos de CPI, deslocações do PR…)
  -- estão ocultos por defeito e não devem receber notícias ligadas.
  where not i.procedimento;

  -- IDF no corpus conjunto (títulos das iniciativas + texto dos comunicados)
  select (select count(*) from _ini) + (select count(*) from public.comunicados) into v_n;
  create temporary table _df on commit drop as
  select t, (ln(v_n) - ln(count(*)))::real as w
  from (
    select unnest(tok) as t from _ini
    union all
    select unnest(public.ligacao_tokens(c.titulo || ' ' || c.corpo)) from public.comunicados c
  ) x
  group by t;

  create temporary table _iw on commit drop as
  select i.*,
    (select array_agg(coalesce(d.w, 8) order by u.ord)
       from unnest(i.tok) with ordinality u(t, ord) left join _df d on d.t = u.t) as ws,
    (select sum(coalesce(d.w, 8)) from unnest(i.tok) u(t) left join _df d on d.t = u.t) as wsum
  from _ini i
  where cardinality(i.tok) >= 2;

  create temporary table _cands on commit drop as
  with pairs as (
    select c.id as comunicado_id, i.id as iniciativa_id, cardinality(i.tok) as n_i, i.wsum,
      (select coalesce(sum(w), 0) from unnest(i.tok, i.ws) u(t, w) where t = any (c.tok_lead)) as wl,
      (select coalesce(sum(w), 0) from unnest(i.tok, i.ws) u(t, w) where t = any (c.tok_body)) as wb,
      (select count(*) from unnest(i.tok, i.ws) u(t, w) where t = any (c.tok_body) and w >= 3) as raras,
      similarity(c.t, lower(i.titulo)) as s_tit,
      ('Governo' = any (i.autores) and i.tipo in ('Proposta de Lei', 'Proposta de Resolução')) as gov,
      c.leg,
      (i.data_votacao is not null and public.pt_dia_mes(i.data_votacao) = any (c.datas)) as data_citada
    from _com c
    join _iw i
      on (i.data_entrada between c.publicado_em - p_dias_antes and c.publicado_em + p_dias_depois)
      or (i.data_votacao between c.publicado_em - p_dias_voto and c.publicado_em + p_dias_voto)
  ),
  scored as (
    select *,
      (wl / wsum) * least(1, wl / 10) as lex_lead,
      (wb / wsum) * least(1, wb / 10) as lex_body
    from pairs
    where raras >= 2 or (wl / wsum >= 0.6 and wl >= 6)
  ),
  final as (
    select *,
      least(1,
        greatest(lex_lead, 0.75 * lex_body, s_tit) * 0.75
        + case when gov then 0.10 else 0 end
        + case when leg then 0.05 else 0 end
        + case when data_citada then 0.10 else 0 end
        - case when n_i < 3 and not (wl >= wsum and wl >= 6) then 0.15 else 0 end
      )::real as score
    from scored
  ),
  ranked as (
    select *, row_number() over (partition by comunicado_id order by score desc, iniciativa_id) as rn
    from final
  )
  select * from ranked where score >= p_min and rn <= p_top;

  select count(distinct comunicado_id), count(*) into v_com, v_prop from _cands;

  with up as (
    insert into public.comunicado_iniciativa as ci
      (comunicado_id, iniciativa_id, score, metodo, motivo)
    select comunicado_id, iniciativa_id, score, 'tokens_idf_trgm_v1',
      jsonb_build_object(
        'lex_lead', round(lex_lead::numeric, 3),
        'lex_corpo', round(lex_body::numeric, 3),
        's_titulo', round(s_tit::numeric, 3),
        'palavras_raras', raras,
        'governo', gov,
        'fala_parlamento', leg,
        'data_citada', data_citada,
        'auto_alta', score >= p_auto
      )
    from _cands
    on conflict (comunicado_id, iniciativa_id) do update
      set score = excluded.score, motivo = excluded.motivo, metodo = excluded.metodo, updated_at = now()
      where ci.confirmado is null
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted) into v_new from up;

  -- Propostas antigas (não revistas) que deixaram de passar o limiar saem
  delete from public.comunicado_iniciativa ci
  using public.comunicados c
  where ci.comunicado_id = c.id
    and c.publicado_em >= p_since
    and ci.confirmado is null
    and not exists (
      select 1 from _cands x where x.comunicado_id = ci.comunicado_id and x.iniciativa_id = ci.iniciativa_id
    );

  return query select v_com, v_prop, v_new;
end;
$$;

revoke all on function public.propose_comunicado_links(date, real, int, int, int, int, real) from public;
grant execute on function public.propose_comunicado_links(date, real, int, int, int, int, real) to service_role;

-- Revisão manual: confirmar (true) / rejeitar (false) / voltar a proposta (null)
create or replace function public.review_comunicado_link(
  p_comunicado_id text,
  p_iniciativa_id text,
  p_confirmado boolean,
  p_por text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.comunicado_iniciativa
  set confirmado = p_confirmado,
      confirmado_em = case when p_confirmado is null then null else now() end,
      confirmado_por = p_por,
      updated_at = now()
  where comunicado_id = p_comunicado_id and iniciativa_id = p_iniciativa_id;
  if not found then
    -- ligação manual nova (confirmada à partida)
    insert into public.comunicado_iniciativa
      (comunicado_id, iniciativa_id, score, metodo, motivo, confirmado, confirmado_em, confirmado_por)
    values (p_comunicado_id, p_iniciativa_id, 1, 'manual', '{}'::jsonb, coalesce(p_confirmado, true), now(), p_por);
  end if;
end;
$$;

revoke all on function public.review_comunicado_link(text, text, boolean, text) from public;
grant execute on function public.review_comunicado_link(text, text, boolean, text) to service_role;
