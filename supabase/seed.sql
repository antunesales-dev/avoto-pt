-- Seed de iniciativas (dados de desenvolvimento; em produção: import AR)
-- Executado por: supabase db reset

insert into public.iniciativas (
  id, id_oficial, titulo, tipo, legislatura, numero, autores,
  data_entrada, data_votacao, estado, tema,
  descricao_oficial, explicacao, links, resultado_partidos
) values
(
  'pl-42-xvi',
  'PL 42/XVI/1',
  'Projeto de Lei que reforça a transparência das votações parlamentares',
  'Projeto de Lei',
  'XVI',
  42,
  array['Grupo Parlamentar do PS'],
  '2025-11-12',
  '2026-03-18',
  'aprovado',
  'Instituições',
  'Procede à alteração do Regimento da Assembleia da República, prevendo a publicação atempada e em formato aberto dos resultados nominais de todas as votações em plenário.',
  'A iniciativa propõe que os resultados de todas as votações em Plenário sejam publicados de forma atempada, em formatos reutilizáveis (JSON/CSV), incluindo o sentido de voto de cada deputado, quando a votação for nominal.',
  '[{"label":"Texto na AR","url":"https://www.parlamento.pt"}]'::jsonb,
  '{"ps":"favor","psd":"favor","chega":"abstencao","il":"favor","be":"favor","pcp":"favor","livre":"favor","pan":"favor","cds":"contra"}'::jsonb
),
(
  'pl-118-xvi',
  'PL 118/XVI/1',
  'Proposta de Lei do Orçamento do Estado para 2026',
  'Proposta de Lei',
  'XVI',
  118,
  array['Governo'],
  '2025-10-10',
  '2025-11-28',
  'aprovado',
  'Economia',
  'Aprova o Orçamento do Estado para o ano económico de 2026.',
  'Documento anual que define receitas e despesas públicas para 2026.',
  '[{"label":"Texto na AR","url":"https://www.parlamento.pt"}]'::jsonb,
  '{"ps":"favor","psd":"contra","chega":"contra","il":"contra","be":"contra","pcp":"contra","livre":"abstencao","pan":"abstencao","cds":"contra"}'::jsonb
),
(
  'pj-r-33-xvi',
  'PjR 33/XVI/1',
  'Projeto de Resolução sobre habitação acessível nas áreas metropolitanas',
  'Projeto de Resolução',
  'XVI',
  33,
  array['Grupo Parlamentar do BE', 'Grupo Parlamentar do LIVRE'],
  '2026-01-20',
  '2026-04-09',
  'rejeitado',
  'Habitação',
  'Recomenda ao Governo medidas urgentes de habitação a custos acessíveis nas Áreas Metropolitanas de Lisboa e do Porto.',
  'Resolução (não vinculativa como uma lei) que recomenda políticas de habitação.',
  '[{"label":"Texto na AR","url":"https://www.parlamento.pt"}]'::jsonb,
  '{"ps":"contra","psd":"contra","chega":"contra","il":"contra","be":"favor","pcp":"favor","livre":"favor","pan":"favor","cds":"contra"}'::jsonb
),
(
  'pl-7-xvi',
  'PL 7/XVI/1',
  'Projeto de Lei de proteção da costa e zonas húmidas',
  'Projeto de Lei',
  'XVI',
  7,
  array['Grupo Parlamentar do PAN', 'Grupo Parlamentar do LIVRE'],
  '2025-09-03',
  '2026-02-11',
  'aprovado',
  'Ambiente',
  'Estabelece medidas de proteção reforçada da orla costeira e de zonas húmidas de interesse nacional.',
  'Reforça regras de construção e uso do solo na orla costeira e em zonas húmidas classificadas.',
  '[{"label":"Texto na AR","url":"https://www.parlamento.pt"}]'::jsonb,
  '{"ps":"favor","psd":"abstencao","chega":"contra","il":"abstencao","be":"favor","pcp":"favor","livre":"favor","pan":"favor","cds":"contra"}'::jsonb
),
(
  'mocao-confianca-1',
  'Moção 1/XVI',
  'Moção de confiança ao Governo',
  'Moção',
  'XVI',
  1,
  array['Governo'],
  '2025-04-02',
  '2025-04-10',
  'aprovado',
  'Instituições',
  'Moção de confiança apresentada pelo Governo à Assembleia da República.',
  'Instrumento em que o Governo solicita a confiança da Assembleia da República.',
  '[{"label":"Texto na AR","url":"https://www.parlamento.pt"}]'::jsonb,
  '{"ps":"favor","psd":"contra","chega":"contra","il":"contra","be":"contra","pcp":"contra","livre":"abstencao","pan":"abstencao","cds":"contra"}'::jsonb
),
(
  'pl-201-xvi',
  'PL 201/XVI/1',
  'Projeto de Lei sobre literacia digital e cidadania nas escolas',
  'Projeto de Lei',
  'XVI',
  201,
  array['Grupo Parlamentar da IL', 'Grupo Parlamentar do PSD'],
  '2026-05-14',
  null,
  'em_discussao',
  'Educação',
  'Introduz conteúdos obrigatórios de literacia digital, pensamento crítico e cidadania no ensino básico e secundário.',
  'Ainda em discussão — os cidadãos podem votar; o resultado oficial da AR será actualizado quando existir votação.',
  '[{"label":"Texto na AR","url":"https://www.parlamento.pt"}]'::jsonb,
  '{"ps":"nao_participou","psd":"nao_participou","chega":"nao_participou","il":"nao_participou","be":"nao_participou","pcp":"nao_participou","livre":"nao_participou","pan":"nao_participou","cds":"nao_participou"}'::jsonb
),
(
  'pj-r-12-xvi',
  'PjR 12/XVI/1',
  'Projeto de Resolução — reforço do SNS no interior do país',
  'Projeto de Resolução',
  'XVI',
  12,
  array['Grupo Parlamentar do PCP'],
  '2025-12-02',
  '2026-01-22',
  'aprovado',
  'Saúde',
  'Recomenda ao Governo medidas de reforço da rede de cuidados de saúde no interior e regiões autónomas.',
  'Foca o acesso a cuidados em territórios de baixa densidade.',
  '[{"label":"Texto na AR","url":"https://www.parlamento.pt"}]'::jsonb,
  '{"ps":"favor","psd":"favor","chega":"abstencao","il":"abstencao","be":"favor","pcp":"favor","livre":"favor","pan":"favor","cds":"favor"}'::jsonb
),
(
  'pl-55-xvi',
  'PL 55/XVI/1',
  'Projeto de Lei de alteração ao Código do Trabalho — teletrabalho',
  'Projeto de Lei',
  'XVI',
  55,
  array['Grupo Parlamentar do PSD'],
  '2026-02-28',
  '2026-06-04',
  'rejeitado',
  'Trabalho',
  'Altera o regime de teletrabalho no Código do Trabalho.',
  'Propõe regras sobre elegibilidade, compensação de custos e direito à desconexão.',
  '[{"label":"Texto na AR","url":"https://www.parlamento.pt"}]'::jsonb,
  '{"ps":"contra","psd":"favor","chega":"favor","il":"favor","be":"contra","pcp":"contra","livre":"abstencao","pan":"abstencao","cds":"favor"}'::jsonb
);

-- contadores públicos a zero (votos de cidadãos só via cast_voto encriptado)
insert into public.iniciativa_voto_counts (iniciativa_id)
select id from public.iniciativas
on conflict (iniciativa_id) do nothing;

-- ---------------------------------------------------------------------------
-- Despesa pública (estrutura; source=seed até sync oficial base.gov / dados.gov)
-- ---------------------------------------------------------------------------
insert into public.despesas_publicas (
  id, tipo, titulo, entidade, montante_eur, data_publicacao, descricao, categoria, links, source
) values
(
  'desp-ex-001',
  'contrato_publico',
  'Exemplo estrutural — contrato de serviços de TI (seed)',
  'Ministério exemplo (dados de demonstração)',
  1250000.00,
  '2026-01-15',
  'Linha de demonstração do modelo de despesa. Em produção: Base.gov.pt / Dados.gov.pt oficiais.',
  'TIC',
  '[{"label":"Portal BASE (oficial)","url":"https://www.base.gov.pt"},{"label":"dados.gov.pt","url":"https://dados.gov.pt"}]'::jsonb,
  'seed'
),
(
  'desp-ex-002',
  'investimento_publico',
  'Exemplo estrutural — investimento em infraestruturas (seed)',
  'Administração Central (demonstração)',
  45000000.00,
  '2025-11-01',
  'Montante ilustrativo para UI de transparência de spending. Não é um contrato real.',
  'Infraestruturas',
  '[{"label":"Dados Abertos Estado","url":"https://dados.gov.pt"}]'::jsonb,
  'seed'
),
(
  'desp-ex-003',
  'orcamento_linha',
  'Exemplo estrutural — linha orçamental (seed)',
  'OE (demonstração)',
  8900000.00,
  '2026-01-01',
  'Placeholder de linha de Orçamento do Estado até importação oficial.',
  'Saúde',
  '[{"label":"DGO / OE","url":"https://www.dgo.gov.pt"}]'::jsonb,
  'seed'
)
on conflict (id) do nothing;

insert into public.investimentos (
  id, titulo, descricao, montante_eur, entidade, sector,
  data_referencia, decisao_oficial, decisao_detalhe, despesa_id, links, source
) values
(
  'inv-ex-001',
  'Investimento em infraestruturas (exemplo seed)',
  'Os cidadãos registados podem votar a favor, contra ou abster-se. A decisão oficial (quando existir nos dados oficiais) aparece lado a lado — sem recomendações políticas.',
  45000000.00,
  'Administração Central (demonstração)',
  'Infraestruturas',
  '2025-11-01',
  'em_curso',
  'Estado nos dados oficiais: a preencher pelo sync. Seed apenas para UI.',
  'desp-ex-002',
  '[{"label":"dados.gov.pt","url":"https://dados.gov.pt"}]'::jsonb,
  'seed'
),
(
  'inv-ex-002',
  'Contrato TIC de serviços (exemplo seed)',
  'Compare a opinião agregada dos cidadãos com a decisão oficial registada (quando disponível).',
  1250000.00,
  'Ministério exemplo (demonstração)',
  'TIC',
  '2026-01-15',
  'aprovado',
  'Seed: marcado como aprovado apenas para demonstrar a UI de comparação.',
  'desp-ex-001',
  '[{"label":"Base.gov.pt","url":"https://www.base.gov.pt"}]'::jsonb,
  'seed'
)
on conflict (id) do nothing;

insert into public.investimento_voto_counts (investimento_id)
select id from public.investimentos
on conflict (investimento_id) do nothing;

-- Digests de exemplo (datas de votação das iniciativas seed)
select public.generate_daily_digest(d::date)
from (
  values
    ('2026-03-18'),
    ('2026-04-09'),
    ('2026-05-14'),
    ('2026-06-04')
) as t(d);
