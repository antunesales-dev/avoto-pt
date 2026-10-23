// Contexto factual da ficha da iniciativa (src/lib/fichaContexto.js). Correr: pnpm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agruparDocumentos, factosFicha, fasesCompactas, fonteTextoLabel, oQuePropoe } from '../src/lib/fichaContexto.js'

const item = {
  tipo: 'Projeto de Lei',
  autores: ['Cidadãos'],
  autoresDeputados: [],
  dataEntrada: '2025-09-05',
  comissao: {
    nome: 'Comissão de Trabalho, Segurança Social e Inclusão',
    audicoes: 6,
    audicoes_datas: ['2025-10-22', '2026-02-11'],
    apreciacao_publica: { inicio: '2025-10-16', fim: '2025-11-15' },
    pareceres_recebidos: [],
  },
  debates: [{ intervencoes: [{ nome: 'A' }, { nome: 'B' }, { nome: 'A' }] }],
  votacoes: [{}, {}, {}],
  votacaoPrincipal: { resultado: 'Aprovado', fase: 'Votação final global', data: '2026-10-16' },
  peticoes: [{ numero: '1' }],
  conjuntas: [],
}

test('factos: só a partir de dados oficiais, com datas pt-PT', () => {
  const f = Object.fromEntries(factosFicha(item).map((x) => [x.k, x.v]))
  assert.equal(f.Tipo, 'Projeto de Lei · Cidadãos')
  assert.equal(f['Entrada na AR'], '05/09/2025')
  assert.equal(f['Apreciação pública'], '16/10/2025 – 15/11/2025')
  assert.equal(f['Audições na comissão'], '2 audições')
  assert.equal(f['Debate em plenário'], '1 sessão · 2 oradores')
  assert.equal(f.Resultado, 'Aprovado · Votação final global · 16/10/2026')
  assert.equal(f['Petições associadas'], '1')
  assert.equal(f['Discutida com'], undefined)
  assert.deepEqual(factosFicha(null), [])
})

test('documentos agrupados por natureza, ordem estável', () => {
  const g = agruparDocumentos([
    { titulo: 'Nota Técnica', tipo: 'Nota técnica', url: '1' },
    { titulo: 'Texto da iniciativa', tipo: 'Texto', url: '2' },
    { titulo: 'Parecer do Governo Regional', tipo: 'Comissão', url: '3' },
    { titulo: 'Apreciação Pública -Link dos Contributos', tipo: 'Link', url: '4' },
    { titulo: 'Relatório', tipo: 'Relatório', url: '5' },
    { titulo: 'Vídeo', tipo: 'Link', url: '6' },
    { titulo: 'Nota de admissibilidade', tipo: 'Anexo', url: '7' },
  ])
  assert.deepEqual(g.map((x) => [x.id, x.itens.map((d) => d.url)]), [
    ['texto', ['2']],
    ['pareceres', ['3']],
    ['nota', ['1', '7']],
    ['relatorio', ['5']],
    ['publico', ['4']],
    ['outros', ['6']],
  ])
  assert.deepEqual(agruparDocumentos(null), [])
})

test('o que propõe: objeto (lei) > dispositivo (resolução); nada se o texto não estiver ok', () => {
  assert.deepEqual(oQuePropoe({ estado: 'ok', objeto: 'Fica o Governo autorizado a:\nAlterar o Código Civil;', dispositivo: ['x'] }), {
    tipo: 'objeto',
    titulo: 'Artigo 1.º do texto oficial',
    linhas: ['Fica o Governo autorizado a:', 'Alterar o Código Civil;'],
  })
  assert.equal(oQuePropoe({ estado: 'ok', objeto: null, dispositivo: ['Avalie…'] }).tipo, 'dispositivo')
  assert.equal(oQuePropoe({ estado: 'erro', objeto: 'x' }), null)
  assert.equal(oQuePropoe(null), null)
})

test('fonte do excerto é sempre identificada; PDF avisa que a extração pode ter falhas', () => {
  assert.match(fonteTextoLabel('docx'), /\.docx/)
  assert.match(fonteTextoLabel('pdf:doc'), /PDF.*falhas/)
  assert.match(fonteTextoLabel(null), /texto oficial/)
})

test('percurso compacto: fases principais e repetições seguidas agregadas', () => {
  const fases = [
    { fase: 'Entrada', data: '2025-09-05' },
    { fase: 'Publicação em Separata', data: '2025-10-16' },
    { fase: 'Baixa comissão para discussão', data: '2026-01-01' },
    { fase: 'Baixa comissão para discussão', data: '2026-02-01', dar: { url: 'u' } },
    { fase: 'Votação final global', data: '2026-10-16' },
  ]
  const out = fasesCompactas(fases, /^(entrada|baixa comiss|vota)/i)
  assert.deepEqual(out.map((f) => [f.fase, f.repeticoes || 1]), [
    ['Entrada', 1],
    ['Baixa comissão para discussão', 2],
    ['Votação final global', 1],
  ])
  assert.equal(out[1].dar.url, 'u')
  assert.equal(fases.length, 5) // não muta a entrada
})

test('descrição oficial só aparece se não repetir o título', async () => {
  const { descricaoUtil } = await import('../src/lib/fichaContexto.js')
  assert.equal(descricaoUtil({ titulo: 'Alargamento da Licença Parental Inicial', descricaoOficial: 'Alargamento da licença parental inicial.' }), null)
  assert.equal(descricaoUtil({ titulo: 'X', descricaoOficial: 'X — Texto de substituição' }), 'X — Texto de substituição')
  assert.equal(descricaoUtil(null), null)
})

test('o que propõe (resolução): inclui o parágrafo de transição literal como introdução', () => {
  const r = oQuePropoe({ estado: 'ok', dispositivo: ['Avalie…'], transicao: 'Assim, … recomenda ao Governo que:' })
  assert.equal(r.intro, 'Assim, … recomenda ao Governo que:')
})
