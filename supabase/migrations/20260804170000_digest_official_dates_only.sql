-- Resumo do dia: só datas oficiais do registo, nunca last_synced_at.
-- last_synced_at muda em cada cron → o boletim “do dia” engolia o catálogo inteiro
-- (ex.: 379 despesas de 2025 no resumo de 04/08/2026).
--
-- Investimentos = subconjunto da despesa (≥100k): não entram no título/summary
-- (evita “379 despesas · 158 investimentos” como se fossem duas fontes).

create or replace function public.generate_daily_digest(p_date date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := to_char(p_date, 'YYYY-MM-DD');
  v_date_pt text := to_char(p_date, 'DD/MM/YYYY');
  v_ini jsonb;
  v_des jsonb;
  v_inv jsonb;
  v_n_ini integer;
  v_n_des integer;
  v_n_inv integer;
  v_with_cidadaos integer;
  v_title text;
  v_summary text;
  v_items jsonb;
  v_parts text[] := array[]::text[];
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Parlamento: data de votação oficial (não “sincronizado hoje”)
  select
    coalesce(jsonb_agg(item order by item ->> 'id_oficial' nulls last, item ->> 'iniciativa_id'), '[]'::jsonb),
    count(*)::integer,
    count(*) filter (where (item -> 'votos_cidadaos' ->> 'total')::int > 0)::integer
  into v_ini, v_n_ini, v_with_cidadaos
  from (
    select jsonb_build_object(
      'kind', 'iniciativa',
      'iniciativa_id', i.id,
      'id_oficial', i.id_oficial,
      'titulo', i.titulo,
      'tipo', i.tipo,
      'legislatura', i.legislatura,
      'numero', i.numero,
      'estado', i.estado,
      'tema', i.tema,
      'data_votacao', i.data_votacao,
      'data_entrada', i.data_entrada,
      'autores', coalesce(to_jsonb(i.autores), '[]'::jsonb),
      'descricao_oficial', coalesce(i.descricao_oficial, ''),
      'explicacao', coalesce(i.explicacao, ''),
      'links', coalesce(i.links, '[]'::jsonb),
      'resultado_partidos', coalesce(i.resultado_partidos, '{}'::jsonb),
      'votos_cidadaos', jsonb_build_object(
        'favor', coalesce(c.favor, 0),
        'contra', coalesce(c.contra, 0),
        'abstencao', coalesce(c.abstencao, 0),
        'total', coalesce(c.favor, 0) + coalesce(c.contra, 0) + coalesce(c.abstencao, 0)
      )
    ) as item
    from public.iniciativas i
    left join public.iniciativa_voto_counts c on c.iniciativa_id = i.id
    where i.data_votacao = p_date
  ) t;

  -- Despesa: data de publicação oficial no Portal Base (única data do boletim)
  select
    coalesce(jsonb_agg(item order by (item ->> 'montante_eur')::numeric desc nulls last), '[]'::jsonb),
    count(*)::integer
  into v_des, v_n_des
  from (
    select jsonb_build_object(
      'kind', 'despesa',
      'despesa_id', d.id,
      'titulo', d.titulo,
      'tipo', d.tipo,
      'entidade', d.entidade,
      'montante_eur', d.montante_eur,
      'data_publicacao', d.data_publicacao,
      'categoria', d.categoria,
      'descricao', d.descricao,
      'links', coalesce(d.links, '[]'::jsonb),
      'source', d.source
    ) as item
    from public.despesas_publicas d
    where d.data_publicacao = p_date
  ) t;

  -- Investimentos: data_referencia oficial (subconjunto ≥100k; UI do digest não lista em duplicado)
  select
    coalesce(jsonb_agg(item order by (item ->> 'montante_eur')::numeric desc nulls last), '[]'::jsonb),
    count(*)::integer
  into v_inv, v_n_inv
  from (
    select jsonb_build_object(
      'kind', 'investimento',
      'investimento_id', i.id,
      'despesa_id', i.despesa_id,
      'titulo', i.titulo,
      'entidade', i.entidade,
      'sector', i.sector,
      'montante_eur', i.montante_eur,
      'data_referencia', i.data_referencia,
      'decisao_oficial', i.decisao_oficial,
      'descricao', i.descricao,
      'links', coalesce(i.links, '[]'::jsonb),
      'votos_cidadaos', jsonb_build_object(
        'favor', coalesce(c.favor, 0),
        'contra', coalesce(c.contra, 0),
        'abstencao', coalesce(c.abstencao, 0),
        'total', coalesce(c.favor, 0) + coalesce(c.contra, 0) + coalesce(c.abstencao, 0)
      )
    ) as item
    from public.investimentos i
    left join public.investimento_voto_counts c on c.investimento_id = i.id
    where i.data_referencia = p_date
  ) t;

  v_ini := coalesce(v_ini, '[]'::jsonb);
  v_des := coalesce(v_des, '[]'::jsonb);
  v_inv := coalesce(v_inv, '[]'::jsonb);
  v_n_ini := coalesce(v_n_ini, 0);
  v_n_des := coalesce(v_n_des, 0);
  v_n_inv := coalesce(v_n_inv, 0);
  v_with_cidadaos := coalesce(v_with_cidadaos, 0);

  if v_n_ini > 0 then
    v_parts := array_append(
      v_parts,
      v_n_ini::text || case when v_n_ini = 1 then ' votação no Parlamento' else ' votações no Parlamento' end
    );
  end if;
  if v_n_des > 0 then
    v_parts := array_append(
      v_parts,
      v_n_des::text || case when v_n_des = 1 then ' despesa pública' else ' despesas públicas' end
    );
  end if;
  -- Não acrescentar investimentos ao título: são o mesmo Portal Base (≥100k €).

  if cardinality(v_parts) = 0 then
    v_title := 'Resumo do dia · sem actividade · ' || v_date_pt;
    v_summary :=
      'Neste dia ainda não há leis/votações nem despesas com data de publicação/votação '
      || 'oficial igual a ' || v_date_pt || ' nos dados importados. '
      || 'O resumo usa só datas oficiais do registo — não a data em que o sistema sincronizou.';
  else
    v_title := 'Resumo do dia · ' || array_to_string(v_parts, ' · ') || ' · ' || v_date_pt;
    v_summary :=
      'Boletim factual de ' || v_date_pt || ': ' || array_to_string(v_parts, ', ') || '. '
      || case
           when v_n_ini > 0 and v_with_cidadaos > 0 then
             'Em ' || v_with_cidadaos::text
             || ' iniciativa(s) já há votos de cidadãos na A Voto, ao lado do voto dos partidos. '
           when v_n_ini > 0 then
             'Em cada lei vê o que cada partido votou e, se alguém na A Voto votou, a comparação. '
           else ''
         end
      || case
           when v_n_des > 0 and v_n_inv > 0 then
             'Dos contratos desse dia, ' || v_n_inv::text
             || ' têm valor ≥ 100 000 € e estão também em Investimentos para voto cidadão. '
           else ''
         end
      || 'Não é notícia nem opinião — só dados oficiais e contagens da plataforma.';
  end if;

  v_items := jsonb_build_object(
    'sections', jsonb_build_object(
      'iniciativas', jsonb_build_object('count', v_n_ini, 'items', v_ini),
      'despesas', jsonb_build_object('count', v_n_des, 'items', v_des),
      'investimentos', jsonb_build_object('count', v_n_inv, 'items', v_inv)
    ),
    'legacy_items', v_ini,
    'criteria', jsonb_build_object(
      'date_field_iniciativas', 'data_votacao',
      'date_field_despesas', 'data_publicacao',
      'date_field_investimentos', 'data_referencia',
      'excludes_last_synced_at', true
    )
  );

  insert into public.daily_digests (id, digest_date, title, summary, source_urls, items, generated_at, source)
  values (
    v_id,
    p_date,
    v_title,
    v_summary,
    jsonb_build_array(
      jsonb_build_object(
        'label', 'Dados Abertos da Assembleia da República',
        'url', 'https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx'
      ),
      jsonb_build_object(
        'label', 'Portal Base (contratos públicos)',
        'url', 'https://www.base.gov.pt'
      ),
      jsonb_build_object(
        'label', 'dados.gov.pt',
        'url', 'https://dados.gov.pt'
      )
    ),
    v_items,
    now(),
    'multi_section'
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

comment on function public.generate_daily_digest(date) is
  'Resumo do dia: só data_votacao / data_publicacao / data_referencia oficiais. Nunca last_synced_at. Sem AI.';

-- Regravar boletins já existentes com a regra correcta (datas oficiais).
do $$
declare
  r record;
begin
  for r in
    select digest_date from public.daily_digests order by digest_date
  loop
    perform public.generate_daily_digest(r.digest_date);
  end loop;
end;
$$;

-- Remover boletins vazios que só existiam por bleed de last_synced_at
-- (opcional: manter “sem actividade” confunde). Apagamos só se sem items.
delete from public.daily_digests d
where coalesce((d.items -> 'sections' -> 'iniciativas' ->> 'count')::int, 0) = 0
  and coalesce((d.items -> 'sections' -> 'despesas' ->> 'count')::int, 0) = 0
  and coalesce((d.items -> 'sections' -> 'investimentos' ->> 'count')::int, 0) = 0
  and (d.title ilike '%sem actividade%' or d.source = 'multi_section');
