-- Testes SQL leves (correr numa BD LOCAL com as migrações aplicadas):
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/comunicados_ligacoes.sql
-- Tudo dentro de uma transação revertida no fim.
begin;

-- Fixtures
insert into public.iniciativas (id, id_oficial, titulo, tipo, legislatura, autores, data_entrada, data_votacao, estado, tema)
values ('t-ini-1', 'P 9001 XVII', 'Autoriza o Governo a criar Processo Especial de Venda de Coisa Imóvel Indivisa e a alterar o Código Civil',
        'Proposta de Lei', 'XVII', '{Governo}', '2026-04-16', '2026-07-17', 'aprovado', 'Habitação'),
       ('t-ini-2', 'R 9002 XVII', 'Recomenda medidas para a pesca da sardinha nos Açores',
        'Projeto de Resolução', 'XVII', '{PAN}', '2026-04-16', null, 'em_discussao', 'Agricultura');
insert into public.comunicados (id, titulo, resumo, corpo, url_oficial, publicado_em, tipo, tags, areas)
values ('t-com-1', 'Habitação: resolver heranças indivisas para colocar mais casas no mercado',
        'Conselho de Ministros aprova alterações ao direito sucessório',
        E'O Conselho de Ministros aprovou a reforma para acelerar a partilha de heranças indivisas e a venda de imóveis.\n\nSeguiu para o Parlamento e, em 17 de julho, a Assembleia da República autorizou o Governo.',
        'https://portugal.gov.pt/gc25/comunicacao/noticias/t-herancas', '2026-10-22', 'noticia', '{habitação}', '{Presidência}'),
       ('t-com-nom', 'Ministro X', 'O rendimento bruto corresponde…', '', 'https://portugal.gov.pt/gc25/governo/nomeacoes/t-x',
        '2031-01-02', 'nomeacao', '{}', '{}');

-- Corpus de enchimento (fora da janela de datas) para o IDF ter escala também numa BD vazia
-- (`supabase db reset` sem dados): sem isto nenhuma palavra chega a “rara” (peso ≥ 3).
insert into public.iniciativas (id, id_oficial, titulo, tipo, legislatura, autores, data_entrada, estado, tema)
select 't-fill-' || g, 'R ' || (9100 + g) || ' XVII',
       'Recomenda ao Governo a requalificação da escola básica número ' || g || ' do concelho',
       'Projeto de Resolução', 'XVII', '{PS}', date '2015-01-01', 'em_discussao', 'Educação e Ciência'
from generate_series(1, 40) g;

do $$
declare r record; v text;
begin
  -- Passo 5: dia só com nomeação → sem digest
  select public.generate_comunicados_digest('2031-01-02') into v;
  assert v is null, 'dia só com nomeações não deve gerar digest';
  assert not exists (select 1 from public.comunicados_digests where digest_date = '2031-01-02'), 'digest vazio gravado';
  -- dia com notícia → digest com 1 entrada
  select public.generate_comunicados_digest('2026-10-22') into v;
  assert v = 'com-2026-10-22', 'digest esperado';
  assert (select (items->>'count')::int >= 1 from public.comunicados_digests where id = v), 'digest sem itens';
  assert not exists (select 1 from public.comunicados_digests where (items->>'count')::int = 0), 'há digests vazios';

  -- Passo 12: ligação proposta para a iniciativa certa, não para a outra
  select * into r from public.propose_comunicado_links('2026-10-01');
  assert exists (select 1 from public.comunicado_iniciativa where comunicado_id = 't-com-1' and iniciativa_id = 't-ini-1'),
    'ligação heranças ↔ P 9001 não proposta';
  assert not exists (select 1 from public.comunicado_iniciativa where comunicado_id = 't-com-1' and iniciativa_id = 't-ini-2'),
    'ligação falsa proposta';
  assert (select (motivo->>'data_citada')::boolean from public.comunicado_iniciativa
          where comunicado_id = 't-com-1' and iniciativa_id = 't-ini-1'), 'data da votação não detetada';

  -- Lotes (p_ids): um lote de outro comunicado não recalcula nem apaga as propostas de t-com-1
  select * into r from public.propose_comunicado_links('2026-10-01', p_ids => array['nao-existe']);
  assert r.comunicados = 0 and r.propostas = 0, 'lote vazio devia dar 0';
  assert exists (select 1 from public.comunicado_iniciativa where comunicado_id = 't-com-1' and iniciativa_id = 't-ini-1'),
    'lote de outro comunicado apagou propostas';
  select * into r from public.propose_comunicado_links('2026-10-01', p_ids => array['t-com-1']);
  assert r.comunicados = 1 and r.novas = 0, 'lote de t-com-1 devia ser idempotente';

  -- Revisão manual sobrevive a nova proposta
  perform public.review_comunicado_link('t-com-1', 't-ini-1', false, 'teste');
  perform public.propose_comunicado_links('2026-10-01');
  assert (select confirmado = false from public.comunicado_iniciativa where comunicado_id = 't-com-1' and iniciativa_id = 't-ini-1'),
    'rejeição manual foi sobrescrita';

  -- Tokens: acentos/plural e palavras de formulário
  assert public.ligacao_tokens('Imóveis') = '{imove}', 'tokens imóveis';
  assert not ('autor' = any (public.ligacao_tokens('Autoriza o Governo'))), 'stopword autoriza';
  raise notice 'OK: comunicados_ligacoes.sql';
end $$;

rollback;
