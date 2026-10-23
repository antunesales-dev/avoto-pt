-- Testes de integração do plano de conteúdo (A + B + C). BD LOCAL com as migrações aplicadas:
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/plano_conteudo_integracao.sql
-- Tudo numa transação revertida no fim.
begin;

do $$
declare m record; v bigint;
begin
  select * into m from public.metricas_globais;

  -- C: “investimentos” = contratos de Despesa ≥ 100 000 €
  select count(*) into v from public.despesas_publicas where montante_eur >= 100000;
  assert m.investimentos = v, format('investimentos %s <> despesas>=100k %s', m.investimentos, v);
  -- B: comunicados sem nomeações
  select count(*) into v from public.comunicados where tipo <> 'nomeacao';
  assert m.comunicados = v, format('comunicados %s <> sem nomeações %s', m.comunicados, v);
  -- A: iniciativas sem procedimentos internos
  select count(*) into v from public.iniciativas where not procedimento;
  assert m.iniciativas_disponiveis = v, format('iniciativas %s <> sem procedimentos %s', m.iniciativas_disponiveis, v);

  -- B usa a taxonomia de A: temas das notícias ⊆ 16 temas canónicos (sem “Outros”)
  select count(*) into v from public.comunicados
  where tema is not null and tema not in (
    'Saúde', 'Educação e Ciência', 'Trabalho e Segurança Social', 'Habitação',
    'Transportes e Infraestruturas', 'Finanças e Impostos', 'Economia', 'Ambiente e Energia',
    'Agricultura e Mar', 'Justiça e Direitos', 'Imigração e Nacionalidade',
    'Segurança e Administração Interna', 'Defesa', 'Europa e Mundo',
    'Cultura, Juventude e Desporto', 'Estado, Autarquias e Instituições');
  assert v = 0, format('%s comunicados com tema fora da taxonomia canónica', v);

  -- Sem digests de comunicados vazios
  select count(*) into v from public.comunicados_digests where coalesce((items->>'count')::int, 0) = 0;
  assert v = 0, format('%s digests de comunicados vazios', v);

  -- Ligações nunca apontam para procedimentos internos da AR
  select count(*) into v from public.comunicado_iniciativa ci
  join public.iniciativas i on i.id = ci.iniciativa_id where i.procedimento;
  assert v = 0, format('%s ligações a procedimentos', v);
end $$;

-- Procedimentos não recebem propostas de ligação (fixture com o mesmo título de uma notícia)
insert into public.iniciativas (id, id_oficial, titulo, tipo, legislatura, autores, data_entrada, estado, tema, procedimento)
values ('t-proc-1', 'R 9901 XVII', 'Deslocação do Presidente da República à Eslovénia para cimeira bilateral',
        'Projeto de Resolução', 'XVII', '{Presidente da Assembleia da República}', current_date - 3, 'aprovado',
        'Europa e Mundo', true);
insert into public.comunicados (id, titulo, resumo, corpo, url_oficial, publicado_em, tipo, tags, areas)
values ('t-com-proc', 'Deslocação do Presidente da República à Eslovénia para cimeira bilateral',
        'Cimeira bilateral na Eslovénia', E'Deslocação do Presidente da República à Eslovénia.\n\nCimeira bilateral.',
        'https://portugal.gov.pt/gc25/comunicacao/noticias/t-proc', current_date - 1, 'noticia', '{}', '{}');
select * from public.propose_comunicado_links(current_date - 2, 0.1, 5);
do $$
begin
  assert not exists (select 1 from public.comunicado_iniciativa where iniciativa_id = 't-proc-1'),
    'procedimento recebeu proposta de ligação';
  raise notice 'OK: plano_conteudo_integracao.sql';
end $$;

rollback;
