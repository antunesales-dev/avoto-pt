-- Comunicados / notícias do Governo (portugal.gov.pt) — só informação, sem voto.
-- Digest próprio (comunicados_digests), nunca misturado com daily_digests (AR/despesa).

create table if not exists public.comunicados (
  id text primary key,
  titulo text not null,
  resumo text not null default '',
  url_oficial text not null,
  publicado_em date not null,
  tipo text not null default 'noticia'
    check (tipo in ('noticia', 'comunicado_cm', 'intervencao', 'outro')),
  source text not null default 'portugal.gov.pt',
  meta jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists comunicados_url_oficial_uidx
  on public.comunicados (url_oficial);

create index if not exists comunicados_publicado_em_idx
  on public.comunicados (publicado_em desc);

alter table public.comunicados enable row level security;

create policy comunicados_select
  on public.comunicados for select to anon, authenticated using (true);
create policy comunicados_no_i
  on public.comunicados for insert to anon, authenticated with check (false);
create policy comunicados_no_u
  on public.comunicados for update to anon, authenticated using (false) with check (false);
create policy comunicados_no_d
  on public.comunicados for delete to anon, authenticated using (false);

grant select on public.comunicados to anon, authenticated;

comment on table public.comunicados is
  'Comunicados e notícias oficiais (portugal.gov.pt). Só leitura na app; sem voto cidadão.';

-- Digest por dia só de comunicados (IDs + contagem; texto completo fica na tabela comunicados)
create table if not exists public.comunicados_digests (
  id text primary key,
  digest_date date not null unique,
  title text not null,
  summary text not null,
  source_urls jsonb not null default '[]'::jsonb,
  items jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  source text not null default 'portugal.gov.pt'
);

create index if not exists comunicados_digests_date_idx
  on public.comunicados_digests (digest_date desc);

alter table public.comunicados_digests enable row level security;

create policy comunicados_digests_select
  on public.comunicados_digests for select to anon, authenticated using (true);
create policy comunicados_digests_no_i
  on public.comunicados_digests for insert to anon, authenticated with check (false);
create policy comunicados_digests_no_u
  on public.comunicados_digests for update to anon, authenticated using (false) with check (false);
create policy comunicados_digests_no_d
  on public.comunicados_digests for delete to anon, authenticated using (false);

grant select on public.comunicados_digests to anon, authenticated;

comment on table public.comunicados_digests is
  'Boletim diário de comunicados do Governo. Separado de daily_digests (AR/despesa).';

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
  v_title text;
  v_summary text;
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
          'publicado_em', c.publicado_em
        )
        order by c.publicado_em desc, c.titulo
      ),
      '[]'::jsonb
    ),
    count(*)::integer
  into v_items, v_n
  from public.comunicados c
  where c.publicado_em = p_date;

  v_n := coalesce(v_n, 0);
  v_items := coalesce(v_items, '[]'::jsonb);

  if v_n = 0 then
    v_title := 'Comunicados · sem entradas · ' || v_date_pt;
    v_summary :=
      'Neste dia não há comunicados/notícias importados de portugal.gov.pt com data '
      || v_date_pt || '. Isto não é o Resumo do dia da AR/despesa.';
  else
    v_title :=
      'Comunicados · ' || v_n::text
      || case when v_n = 1 then ' entrada' else ' entradas' end
      || ' · ' || v_date_pt;
    v_summary :=
      'Índice de ' || v_n::text
      || ' comunicado(s)/notícia(s) oficiais publicados em ' || v_date_pt
      || ' (portugal.gov.pt). Informação — sem voto. Ver ficha completa em Comunicados.';
  end if;

  insert into public.comunicados_digests (
    id, digest_date, title, summary, source_urls, items, generated_at, source
  )
  values (
    v_id,
    p_date,
    v_title,
    v_summary,
    jsonb_build_array(
      jsonb_build_object(
        'label', 'Portal do Governo — Notícias',
        'url', 'https://portugal.gov.pt/gc25/comunicacao/noticias'
      ),
      jsonb_build_object(
        'label', 'Comunicados do Conselho de Ministros',
        'url', 'https://portugal.gov.pt/gc25/governo/comunicados-do-conselho-de-ministros'
      )
    ),
    jsonb_build_object(
      'count', v_n,
      'items', v_items,
      'criteria', jsonb_build_object(
        'date_field', 'publicado_em',
        'note', 'Só comunicados oficiais. Sem voto. Separado do Resumo do dia AR.'
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

comment on function public.generate_comunicados_digest(date) is
  'Digest diário só de comunicados.gov; não inclui AR nem despesa.';
