-- Digest factual completo (sem AI): todos os campos úteis por item + texto template pt-PT
-- AI (linguagem informal) fica para fase posterior.

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
  v_with_cidadaos integer;
  v_title text;
  v_summary text;
  v_date_pt text;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- DD/MM/YYYY — claro e localizável na UI se preciso
  v_date_pt := to_char(p_date, 'DD/MM/YYYY');

  select
    coalesce(jsonb_agg(item order by item ->> 'id_oficial' nulls last, item ->> 'iniciativa_id'), '[]'::jsonb),
    count(*)::integer,
    count(*) filter (
      where (item -> 'votos_cidadaos' ->> 'total')::int > 0
    )::integer
  into v_items, v_count, v_with_cidadaos
  from (
    select jsonb_build_object(
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
       or (i.data_votacao is null and i.updated_at::date = p_date)
  ) t;

  v_title := case
    when v_count = 0 then 'Sem votações · ' || v_date_pt
    when v_count = 1 then '1 votação · ' || v_date_pt
    else v_count::text || ' votações · ' || v_date_pt
  end;

  v_summary := case
    when v_count = 0 then
      'Não há iniciativas com data de votação (ou actualização) neste dia nos dados da plataforma. '
      || 'Quando o sync da AR tiver registos, aparecem aqui o título oficial, o voto de cada partido e o dos cidadãos.'
    when v_count = 1 and v_with_cidadaos = 0 then
      '1 iniciativa neste dia. Abaixo: dados oficiais, voto dos partidos na AR e votos dos cidadãos (ainda sem votos na A Voto).'
    when v_count = 1 then
      '1 iniciativa neste dia. Abaixo: dados oficiais, voto dos partidos na AR e votos dos cidadãos na A Voto.'
    when v_with_cidadaos = 0 then
      v_count::text
      || ' iniciativas neste dia. Cada cartão mostra o título oficial, o estado, o voto de cada partido na AR e as contagens de cidadãos (ainda sem votos na A Voto nestes itens).'
    when v_with_cidadaos = v_count then
      v_count::text
      || ' iniciativas neste dia. Em todas há votos de cidadãos na A Voto — comparáveis com o voto dos partidos na AR.'
    else
      v_count::text
      || ' iniciativas neste dia. Em '
      || v_with_cidadaos::text
      || ' há votos de cidadãos na A Voto. Cada cartão: dados oficiais + partidos + cidadãos.'
  end;

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

comment on function public.generate_daily_digest(date) is
  'Monta digest factual do dia a partir de iniciativas + contagens. Sem AI — só dados e templates pt-PT.';
