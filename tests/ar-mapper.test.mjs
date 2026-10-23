// Testes do mapper da AR e da taxonomia de temas. Correr: pnpm test (node --test, sem dependências).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  assignDossies,
  decideEstado,
  extractAutores,
  extractVotacoes,
  isProcedimento,
  mapArIniciativa,
  parseAusencias,
  parseDetalhe,
  parseDetalhePartidos,
  tipoVotacao,
} from '../supabase/functions/_shared/ar-mapper.js'
import { TEMAS, canonicalTema, classifyTema, inferTemaFromText, temaFromComissao } from '../supabase/functions/_shared/temas.js'

const P1 = JSON.parse(readFileSync(new URL('./fixtures/ar-p1-xvii.json', import.meta.url), 'utf8'))

const ev = (Fase, DataFase, Votacao = null, extra = {}) => ({ Fase, DataFase, Votacao, ...extra })
const vot = (resultado, detalhe = null, extra = {}) => ({ id: String(Math.random()), data: null, resultado, detalhe, ...extra })
const raw = (over = {}) => ({
  IniId: '999001',
  IniLeg: 'XVII',
  IniTipo: 'J',
  IniNr: '7',
  IniTitulo: 'Altera o regime de teste',
  IniDescTipo: 'Projeto de Lei',
  IniEventos: [ev('Entrada', '2025-07-01')],
  ...over,
})

// --- Votos por partido / JPP -------------------------------------------------------
test('parseDetalhePartidos inclui o JPP e o CDS-PP', () => {
  const d = 'A Favor: <I>PSD</I>, <I> CH</I>, <I> JPP</I><BR>Contra:<I>PCP</I>, <I> BE</I><BR>Abstenção: <I>CDS-PP</I>'
  assert.deepEqual(parseDetalhePartidos(d), { psd: 'favor', chega: 'favor', jpp: 'favor', pcp: 'contra', be: 'contra', cds: 'abstencao' })
})

test('parseDetalhe lê o formato com nº de deputados ("86-PSD")', () => {
  const d = 'A Favor: <I>86-PSD</I>, <I> 59-CH</I>, <I> 1-JPP</I><BR>Contra:<I>54-PS</I>, <I> 5-L</I>'
  const { partidos, deputados } = parseDetalhe(d)
  assert.deepEqual(partidos, { psd: 'favor', chega: 'favor', jpp: 'favor', ps: 'contra', livre: 'contra' })
  assert.deepEqual(deputados, { psd: 86, chega: 59, jpp: 1, ps: 54, livre: 5 })
})

test('ausências ficam fora dos votos e são listadas', () => {
  const vo = { ausencias: ['L', 'PCP'], detalhe: 'A Favor: <I>PSD</I><BR>Ausência: <I>L</I>, <I> PCP</I>, <I> BE</I>' }
  assert.deepEqual(parseAusencias(vo), ['be', 'livre', 'pcp'])
  assert.deepEqual(parseDetalhePartidos(vo.detalhe), { psd: 'favor' })
})

test('unânime sem detalhe → todos os partidos da XVII (com JPP) menos os ausentes', () => {
  const [v] = extractVotacoes([ev('Votação final global', '2025-10-01', [vot('Aprovado', null, { unanime: 'unanime', ausencias: ['PAN'] })])])
  assert.equal(v.partidos.jpp, 'favor')
  assert.equal(v.partidos.pan, undefined)
  assert.equal(Object.keys(v.partidos).length, 9)
})

// --- Estado ------------------------------------------------------------------------
test('tipoVotacao distingue final, generalidade e requerimentos', () => {
  assert.equal(tipoVotacao('Votação final global'), 'final')
  assert.equal(tipoVotacao('Votação Deliberação'), 'final')
  assert.equal(tipoVotacao('Votação na generalidade'), 'generalidade')
  assert.equal(tipoVotacao('Requerimento Baixa Comissão sem Votação (Generalidade)'), 'procedimento')
  assert.equal(tipoVotacao('Requerimento dispensa redação final'), 'procedimento')
})

test('aprovado na generalidade sem votação final → aprovado_generalidade (não “aprovado”)', () => {
  const m = mapArIniciativa(raw({ IniEventos: [ev('Entrada', '2025-07-01'), ev('Votação na generalidade', '2025-09-01', [vot('Aprovado', 'A Favor: <I>PSD</I>')])] }))
  assert.equal(m.estado, 'aprovado_generalidade')
  assert.equal(m.votacao_principal.tipo, 'generalidade')
})

test('requerimento de baixa sem votação aprovado não conta como aprovação', () => {
  const m = mapArIniciativa(raw({ IniEventos: [ev('Entrada', '2025-07-01'), ev('Requerimento Baixa Comissão sem Votação (Generalidade)', '2025-07-04', [vot('Aprovado', 'A Favor: <I>PSD</I>')])] }))
  assert.equal(m.estado, 'em_discussao')
  assert.deepEqual(m.resultado_partidos, {})
  assert.equal(m.data_votacao, null)
  assert.equal(m.votacoes.length, 1) // continua visível na ficha
})

test('rejeitado na generalidade → rejeitado; votação final decide', () => {
  assert.equal(decideEstado([{ tipo: 'generalidade', resultado: 'Rejeitado', partidos: {} }], []).estado, 'rejeitado')
  const vs = [
    { tipo: 'generalidade', resultado: 'Aprovado', data: '2025-01-01', partidos: { psd: 'favor' } },
    { tipo: 'final', resultado: 'Rejeitado', data: '2025-02-01', partidos: { psd: 'contra' } },
  ]
  const r = decideEstado(vs, [])
  assert.equal(r.estado, 'rejeitado')
  assert.equal(r.votacao.tipo, 'final')
})

test('publicada em DR → aprovado mesmo com votação posterior rejeitada (P 1/XVII)', () => {
  const m = mapArIniciativa(P1)
  assert.equal(m.estado, 'aprovado')
  assert.ok(m.fases.some((f) => f.fase === 'Lei (Publicação DR)'))
  assert.ok(Object.keys(m.resultado_partidos).length >= 9)
  assert.ok('jpp' in m.resultado_partidos)
})

test('retirada → retirado', () => {
  const m = mapArIniciativa(raw({ IniEventos: [ev('Entrada', '2025-07-01'), ev('Retirada da iniciativa', '2025-08-01')] }))
  assert.equal(m.estado, 'retirado')
})

// --- Temas -------------------------------------------------------------------------
test('taxonomia: 16 temas + Outros', () => {
  assert.equal(TEMAS.length, 17)
  assert.equal(TEMAS.at(-1), 'Outros')
})

test('regex com limites de palavra: “iva” não apanha “legislativa”, “irc” não apanha “circulação”', () => {
  assert.notEqual(inferTemaFromText('Proposta relativa à iniciativa legislativa dos cidadãos'), 'Finanças e Impostos')
  assert.notEqual(inferTemaFromText('Regime de circulação de bicicletas'), 'Finanças e Impostos')
  assert.ok(['Finanças e Impostos', 'Ambiente e Energia'].includes(inferTemaFromText('Redução do IVA da eletricidade')))
  assert.notEqual(inferTemaFromText('Aplicação imediata do regime'), 'Cultura, Juventude e Desporto')
})

test('acentos: “económicos” e “desportivos” são reconhecidos', () => {
  assert.equal(inferTemaFromText('Apoios económicos às famílias'), 'Economia')
  assert.equal(inferTemaFromText('Equipamentos desportivos'), 'Cultura, Juventude e Desporto')
})

test('nacionalidade → Imigração e Nacionalidade (mesmo na comissão de Assuntos Constitucionais)', () => {
  assert.equal(temaFromComissao('Comissão de Assuntos Constitucionais, Direitos, Liberdades e Garantias ', 'Altera a Lei da Nacionalidade'), 'Imigração e Nacionalidade')
  assert.equal(mapArIniciativa(P1).tema, 'Imigração e Nacionalidade')
  assert.equal(mapArIniciativa(P1).tema_fonte, 'comissao')
})

test('comissão competente manda; comissões mistas desempatam por palavras-chave', () => {
  assert.equal(temaFromComissao('Comissão de Agricultura e Pescas', 'Gestão florestal'), 'Agricultura e Mar')
  assert.equal(temaFromComissao('Comissão de Infraestruturas, Mobilidade e Habitação', 'Programa de arrendamento acessível'), 'Habitação')
  assert.equal(temaFromComissao('Comissão de Infraestruturas, Mobilidade e Habitação', 'Linha ferroviária do Oeste'), 'Transportes e Infraestruturas')
  assert.equal(temaFromComissao('Comissão de Assuntos Constitucionais, Direitos, Liberdades e Garantias', 'Reforço dos meios da PSP'), 'Segurança e Administração Interna')
  assert.equal(temaFromComissao('Comissão de Assuntos Constitucionais, Direitos, Liberdades e Garantias', 'Altera o Código Penal'), 'Justiça e Direitos')
  assert.equal(temaFromComissao('Comissão Desconhecida', 'x'), null)
})

test('classifyTema usa palavras-chave sem comissão e “Outros” como último recurso', () => {
  assert.deepEqual(classifyTema({ comissao: null, titulo: 'Reforço do SNS nos hospitais' }), { tema: 'Saúde', fonte: 'palavras_chave' })
  assert.deepEqual(classifyTema({ comissao: null, titulo: 'Xyz' }), { tema: 'Outros', fonte: 'nenhuma' })
})

test('canonicalTema converte temas antigos', () => {
  assert.equal(canonicalTema('Instituições'), 'Estado, Autarquias e Instituições')
  assert.equal(canonicalTema('Saúde'), 'Saúde')
})

// --- Autores -----------------------------------------------------------------------
test('autores reais: sem “Grupos Parlamentares”, com deputados estruturados', () => {
  const r = extractAutores({
    IniAutorOutros: { nome: 'Grupos Parlamentares', sigla: 'GP' },
    IniAutorGruposParlamentares: [{ GP: 'PAN' }],
    IniAutorDeputados: [{ GP: 'PAN', nome: 'Inês de Sousa Real' }],
  })
  assert.deepEqual(r.autores, ['PAN'])
  assert.deepEqual(r.autores_deputados, [{ nome: 'Inês de Sousa Real', gp: 'PAN' }])
})

test('autores: Governo, comissão autora e PAR legível', () => {
  assert.deepEqual(extractAutores({ IniAutorOutros: { nome: 'Governo' } }).autores, ['Governo'])
  assert.deepEqual(extractAutores({ IniAutorOutros: { nome: 'Comissões', iniAutorComissao: 'Comissão de Assuntos Europeus ' } }).autores, ['Comissão de Assuntos Europeus'])
  assert.deepEqual(extractAutores({ IniAutorOutros: { nome: 'PAR' } }).autores, ['Presidente da Assembleia da República'])
})

// --- Ficha rica --------------------------------------------------------------------
test('P 1/XVII: fases, votações, documentos, comissão, debates, conjuntas e link da ficha AR', () => {
  const m = mapArIniciativa(P1)
  assert.equal(m.id, 'ar-xvii-p-1')
  assert.equal(m.ar_ini_id, '315160')
  assert.equal(m.links[0].url, 'https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=315160')
  assert.ok(m.fases.length >= 40)
  assert.deepEqual(m.fases.map((f) => f.data), [...m.fases.map((f) => f.data)].sort())
  assert.ok(m.votacoes.length >= 8)
  assert.ok(m.votacoes.some((v) => v.tipo === 'procedimento'))
  assert.ok(m.documentos.length > 5)
  assert.equal(new Set(m.documentos.map((d) => d.url)).size, m.documentos.length)
  assert.match(m.comissao.nome, /Assuntos Constitucionais/)
  assert.ok(Array.isArray(m.comissao.relatores))
  assert.equal(m.comissao.data_distribuicao, '2025-07-03')
  assert.ok(m.debates.some((d) => d.video?.startsWith('https://av.parlamento.pt/')))
  assert.ok(m.conjuntas.some((c) => c.id_oficial === 'J 20 XVII' && c.iniciativa_id === 'ar-xvii-j-20'))
  assert.deepEqual(m.autores, ['Governo'])
})

// --- Dossiês e procedimentos --------------------------------------------------------
test('procedimentos reconhecidos', () => {
  assert.ok(isProcedimento('Suspensão do prazo de funcionamento da Comissão Parlamentar de Inquérito ao INEM'))
  assert.ok(isProcedimento('Deslocação do Presidente da República a Madrid'))
  assert.ok(isProcedimento('Concessão de processo de urgência – Proposta de Lei n.º 4/XVII/1.ª'))
  assert.ok(!isProcedimento('Altera a Lei da Nacionalidade'))
})

test('assignDossies junta conjuntas e títulos iguais, com id estável do mais antigo', () => {
  const items = [
    { id: 'a', ar_ini_id: '1', titulo: 'Lei X', data_entrada: '2025-02-01', conjuntas: [{ ar_ini_id: '2' }] },
    { id: 'b', ar_ini_id: '2', titulo: 'Outra', data_entrada: '2025-01-01', conjuntas: [] },
    { id: 'c', ar_ini_id: '3', titulo: 'Deslocação do PR a Roma', data_entrada: '2025-03-01', conjuntas: [] },
    { id: 'd', ar_ini_id: '4', titulo: 'Deslocação do PR a  Roma ', data_entrada: '2025-04-01', conjuntas: [] },
    { id: 'e', ar_ini_id: '5', titulo: 'Sozinha', data_entrada: '2025-04-01', conjuntas: [{ ar_ini_id: '999' }] },
  ]
  assert.equal(assignDossies(items), 2)
  assert.equal(items[0].dossie_id, 'dossie-b')
  assert.equal(items[1].dossie_id, 'dossie-b')
  assert.equal(items[2].dossie_id, 'dossie-c')
  assert.equal(items[3].dossie_id, 'dossie-c')
  assert.equal(items[4].dossie_id, null)
})

test('mapArIniciativa rejeita entradas inválidas', () => {
  assert.equal(mapArIniciativa(null), null)
  assert.equal(mapArIniciativa({ IniTitulo: 'x' }), null)
  assert.equal(mapArIniciativa({ IniId: 1, IniTitulo: '  ' }), null)
})

test('comissão: junta relatores das várias entradas da mesma comissão competente', () => {
  const c = (extra) => ({ Nome: 'Comissão de Saúde ', Competente: 'S', ...extra })
  const m = mapArIniciativa(raw({
    IniEventos: [
      ev('Entrada', '2025-07-01'),
      ev('Baixa comissão distribuição inicial generalidade', '2025-07-02', null, { Comissao: [c({ DataDistribuicao: '2025-07-02' })] }),
      ev('Apreciação', '2025-08-01', null, { Comissao: [c({ Relatores: [{ nome: 'Ana Silva', gp: 'PS' }], PareceresRecebidos: [{ nome: 'Ordem dos Médicos' }] })] }),
    ],
  }))
  assert.equal(m.tema, 'Saúde')
  assert.deepEqual(m.comissao.relatores, [{ nome: 'Ana Silva', gp: 'PS' }])
  assert.deepEqual(m.comissao.pareceres_recebidos, ['Ordem dos Médicos'])
})

// --- Contexto extra (ficha): petições, iniciativas de origem/originadas, apreciação pública, audições ---
import { extractPeticoes, extractRelacionadasAr, extractComissao as extractComissaoCtx, AR_PETICAO_URL } from '../supabase/functions/_shared/ar-mapper.js'

test('petições: Peticoes (com ficha na AR) + PeticoesConjuntas por fase, sem duplicados', () => {
  const r = extractPeticoes({
    Peticoes: [{ id: '34231', numero: '12', legislatura: 'XVII', assunto: 'Pela criação de um regime <b>transitório</b>' }],
    IniEventos: [
      { PeticoesConjuntas: [{ id: '11', nr: '256', leg: 'XV', titulo: 'Vacinas antialérgicas' }, { nr: '12', leg: 'XVII', titulo: 'dup' }] },
    ],
  })
  assert.deepEqual(r, [
    { id: '34231', numero: '12', legislatura: 'XVII', assunto: 'Pela criação de um regime transitório', url: AR_PETICAO_URL + '34231', conjunta: false },
    { id: null, numero: '256', legislatura: 'XV', assunto: 'Vacinas antialérgicas', url: null, conjunta: true },
  ])
  assert.deepEqual(extractPeticoes({}), [])
})

test('iniciativas de origem / originadas → ids internos', () => {
  assert.deepEqual(extractRelacionadasAr([{ assunto: 'CPI ao INEM', descTipo: 'Inquérito Parlamentar', id: '315171', legislatura: 'XVII', numero: '2', tipo: 'I' }]), [
    { ar_ini_id: '315171', id_oficial: 'I 2 XVII', iniciativa_id: 'ar-xvii-i-2', tipo: 'Inquérito Parlamentar', titulo: 'CPI ao INEM' },
  ])
  assert.deepEqual(extractRelacionadasAr(null), [])
})

test('comissão: apreciação pública e datas das audições (sem repetir)', () => {
  const c = extractComissaoCtx([
    { Comissao: [{ Competente: 'S', Nome: 'Comissão X', DatainicioApreciacaoPublica: '2025-10-16', DatafimApreciacaoPublica: '2025-11-15', Audicoes: [{ data: '2025-10-22' }] }] },
    { Comissao: [{ Competente: 'S', Nome: 'Comissão X', DatainicioApreciacaoPublica: '0001-01-01T00:00:00', Audicoes: [{ data: '2025-10-22' }, { data: '2026-02-11' }] }] },
  ])
  assert.deepEqual(c.apreciacao_publica, { inicio: '2025-10-16', fim: '2025-11-15' })
  assert.deepEqual(c.audicoes_datas, ['2025-10-22', '2026-02-11'])
  assert.equal(c.audicoes, 3)
})

test('mapArIniciativa: payload inclui os campos novos (P 1 real)', () => {
  const m = mapArIniciativa(P1)
  for (const k of ['peticoes', 'iniciativas_origem', 'iniciativas_originadas']) assert.ok(Array.isArray(m[k]), k)
  assert.ok('texto_substituido' in m)
})
