-- Ligações comunicados ↔ iniciativas em lotes (backfill de 60 dias excedia o statement_timeout
-- de 8 s do PostgREST em produção: run 39980312744).
--
-- Novo parâmetro opcional `p_ids text[]`: quando dado, só (re)calcula e só limpa propostas desses
-- comunicados (dentro de p_since). O IDF continua a ser calculado sobre o corpus inteiro, e o
-- ranking é por comunicado, por isso N chamadas por lotes dão exatamente o mesmo resultado que
-- uma chamada única. Idempotente (upsert + delete restritos ao lote; revistas nunca mudam).
-- Sem p_ids o comportamento é o anterior (compatível com chamadas existentes).
--
-- Nota: `SET statement_timeout` ao nível da função não resolve: o temporizador é armado no início
-- da instrução (o `select rpc(...)` do PostgREST) com o valor da sessão, antes de a função correr.
--
-- A assinatura muda, por isso a função antiga é removida e as permissões repostas
-- (incluindo o REVOKE de anon/authenticated do 20261023150000).

drop function if exists public.propose_comunicado_links(date, real, int, int, int, int, real);

create function public.propose_comunicado_links(
  p_since date default current_date - 14,
  p_min real default 0.5,
  p_top int default 3,
  p_dias_antes int default 270,
  p_dias_depois int default 45,
  p_dias_voto int default 60,
  p_auto real default 0.65,
  p_ids text[] default null
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
  drop table if exists _com, _ini, _df, _iw, _it, _ct, _cands;

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
    and c.tipo in ('noticia', 'comunicado_cm', 'intervencao')
    and (p_ids is null or c.id = any (p_ids));

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
  -- Sem índice, as subconsultas de _iw fazem um seq scan de _df por iniciativa (≈ 10 s).
  create unique index on _df (t);
  analyze _df;

  create temporary table _iw on commit drop as
  select i.*,
    (select array_agg(coalesce(d.w, 8) order by u.ord)
       from unnest(i.tok) with ordinality u(t, ord) left join _df d on d.t = u.t) as ws,
    (select sum(coalesce(d.w, 8)) from unnest(i.tok) u(t) left join _df d on d.t = u.t) as wsum
  from _ini i
  where cardinality(i.tok) >= 2;

  -- Palavras em comum por par (comunicado, iniciativa) com um hash join sobre tokens, em vez
  -- de subconsultas por par (eram ~150 mil pares × 3 varrimentos de arrays: 11 s para 60 dias,
  -- acima dos 8 s de statement_timeout do PostgREST em produção). Mesmos valores de wl/wb/raras:
  -- os tokens são distintos em ambos os lados; pares sem palavras em comum nunca passam `scored`.
  create temporary table _it on commit drop as
  select i.id as iniciativa_id, u.t, u.w
  from _iw i, unnest(i.tok, i.ws) u(t, w);

  create temporary table _ct on commit drop as
  select c.id as comunicado_id, x.t, bool_or(x.lead) as lead, bool_or(not x.lead) as body
  from _com c,
    lateral (
      select t, true as lead from unnest(c.tok_lead) t
      union all
      select t, false from unnest(c.tok_body) t
    ) x
  group by 1, 2;
  analyze _it;
  analyze _ct;

  create temporary table _cands on commit drop as
  with overlap as (
    select ct.comunicado_id, it.iniciativa_id,
      coalesce(sum(it.w) filter (where ct.lead), 0) as wl,
      coalesce(sum(it.w) filter (where ct.body), 0) as wb,
      count(*) filter (where ct.body and it.w >= 3) as raras
    from _ct ct
    join _it it on it.t = ct.t
    group by 1, 2
  ),
  pairs as (
    select c.id as comunicado_id, i.id as iniciativa_id, cardinality(i.tok) as n_i, i.wsum,
      o.wl, o.wb, o.raras,
      similarity(c.t, lower(i.titulo)) as s_tit,
      ('Governo' = any (i.autores) and i.tipo in ('Proposta de Lei', 'Proposta de Resolução')) as gov,
      c.leg,
      (i.data_votacao is not null and public.pt_dia_mes(i.data_votacao) = any (c.datas)) as data_citada
    from overlap o
    join _com c on c.id = o.comunicado_id
    join _iw i on i.id = o.iniciativa_id
    where (i.data_entrada between c.publicado_em - p_dias_antes and c.publicado_em + p_dias_depois)
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
      )::numeric(6, 4)::real as score  -- 4 casas: desempates estáveis (soma de reais não é associativa)
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
    and (p_ids is null or ci.comunicado_id = any (p_ids))
    and ci.confirmado is null
    and not exists (
      select 1 from _cands x where x.comunicado_id = ci.comunicado_id and x.iniciativa_id = ci.iniciativa_id
    );

  return query select v_com, v_prop, v_new;
end;
$$;

revoke all on function public.propose_comunicado_links(date, real, int, int, int, int, real, text[]) from public;
revoke execute on function public.propose_comunicado_links(date, real, int, int, int, int, real, text[]) from anon, authenticated;
grant execute on function public.propose_comunicado_links(date, real, int, int, int, int, real, text[]) to service_role;
