// Extrator do texto oficial (IniLinkTexto) e leitor .docx. Correr: pnpm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { docxDocumentXml, isZip, unzipEntry } from '../scripts/lib/docx.mjs'
import {
  EXTRATOR_VERSAO,
  extractTextoAr,
  formatoTexto,
  paragraphsFromDocxXml,
  paragraphsFromPlainText,
  urlsDescarga,
} from '../supabase/functions/_shared/ar-texto.js'

const P = (...ts) => ts.map((t) => ({ t }))
const DOCX = readFileSync(new URL('./fixtures/texto-ar-minimo.docx', import.meta.url))

test('docx: lê word/document.xml de um ZIP deflate e devolve parágrafos com entidades XML decodificadas', () => {
  assert.equal(isZip(DOCX), true)
  assert.equal(unzipEntry(DOCX, 'nao/existe.xml'), null)
  const paras = paragraphsFromDocxXml(docxDocumentXml(DOCX))
  assert.equal(paras[0].t, 'Projeto de Lei n.º 999/XVII/1.ª')
  assert.ok(paras.some((p) => p.t.includes('famílias & das crianças')))
  assert.equal(docxDocumentXml(Buffer.from('not a zip')), null)
})

test('lei: exposição até ao parágrafo de transição; “Assim, defende-se…” não corta a exposição', () => {
  const r = extractTextoAr(paragraphsFromDocxXml(docxDocumentXml(DOCX)), { titulo: 'Altera o regime de teste das licenças' })
  assert.equal(r.estado, 'ok')
  assert.equal(r.versao, EXTRATOR_VERSAO)
  assert.deepEqual(r.exposicao, [
    'A presente iniciativa visa reforçar a proteção das famílias & das crianças, alargando a licença parental inicial.',
    'Assim, defende-se que a distribuição do período de licença deve ser uma opção livre.',
  ])
  assert.equal(r.objeto, 'A presente lei procede à alteração do Código do Trabalho.')
})

test('lei: articulado só de topo (o Artigo 40.º citado dentro da alteração não entra)', () => {
  const r = extractTextoAr(paragraphsFromDocxXml(docxDocumentXml(DOCX)))
  assert.deepEqual(r.artigos, [
    { n: 1, epigrafe: 'Objeto' },
    { n: 2, epigrafe: 'Alteração ao Código do Trabalho' },
    { n: 3, epigrafe: 'Entrada em vigor' },
  ])
})

test('lei de autorização: a numeração que recomeça (decreto-lei anexo) termina o articulado', () => {
  const r = extractTextoAr(
    P('Exposição de Motivos', 'Texto longo da exposição.', 'Assim:', 'Artigo 1.º', 'Objeto', 'Fica o Governo autorizado a:', 'Alterar o Código Civil;',
      'Artigo 2.º', 'Sentido e extensão', 'O sentido é…', 'Artigo 1.º', 'Objeto', 'O presente decreto-lei…', 'Artigo 2.º', 'Alteração'),
  )
  assert.deepEqual(r.artigos.map((a) => a.n), [1, 2])
  assert.equal(r.objeto, 'Fica o Governo autorizado a:\nAlterar o Código Civil;')
})

test('resolução: parte dispositiva entre a transição e o fecho; sem articulado', () => {
  const r = extractTextoAr([
    { t: 'Projeto de Resolução 200/XVII/1.ª' },
    { t: 'Recomenda ao Governo que reveja o mecanismo' },
    { t: 'Em 2017, na sequência do colapso do Grupo Espírito Santo, foi criada uma solução que permitiu a recuperação de parte do montante investido pelos lesados.' },
    { t: 'Assim, ao abrigo da alínea b) do artigo 156.º da Constituição, os Deputados do PS propõem que a Assembleia da República recomende ao Governo que:' },
    { t: 'Avalie a revisão dos critérios;', lista: true },
    { t: 'Promova o diálogo com as associações.', lista: true },
    { t: 'Palácio de São Bento, 23 de julho 2025,' },
    { t: 'António Exemplo' },
  ])
  assert.equal(r.estado, 'ok')
  assert.equal(r.exposicao.length, 1)
  assert.deepEqual(r.dispositivo, ['Avalie a revisão dos critérios;', 'Promova o diálogo com as associações.'])
  assert.match(r.transicao, /recomende ao Governo que:$/)
  assert.deepEqual(r.artigos, [])
  assert.equal(r.objeto, null)
})

test('resolução: “A Assembleia da República … resolve …” é já o dispositivo', () => {
  const r = extractTextoAr(
    P('Exposição de motivos', 'Na XIII Legislatura a AR aprovou por unanimidade uma lei sobre o tema, que importa agora rever.',
      'Nestes termos, a abaixo assinada Deputada, ao abrigo das disposições constitucionais e regimentais aplicáveis, propõe o seguinte projeto de resolução:',
      'A Assembleia da República, nos termos do n.º 5 do artigo 166.º da Constituição, resolve constituir um grupo de trabalho.',
      'Assembleia da República, Palácio de São Bento, 03 de junho de 2025'),
  )
  assert.deepEqual(r.dispositivo, ['A Assembleia da República, nos termos do n.º 5 do artigo 166.º da Constituição, resolve constituir um grupo de trabalho.'])
})

test('sem estrutura reconhecível: não inventa exposição', () => {
  const r = extractTextoAr(P('Título curto', 'Outra linha', 'Mais uma'))
  assert.equal(r.estado, 'sem_estrutura')
  assert.deepEqual(r.exposicao, [])
  assert.equal(extractTextoAr([]).estado, 'vazio')
})

test('título “Exposição de motivos:” na mesma linha do 1.º parágrafo é removido', () => {
  const r = extractTextoAr(P('Exposição de motivos', 'Exposição de motivos: A Serra da Lousã é reconhecida pela riqueza da sua biodiversidade.', 'Assim:'))
  assert.equal(r.exposicao[0], 'A Serra da Lousã é reconhecida pela riqueza da sua biodiversidade.')
})

test('pdftotext -layout: junta linhas, títulos centrados à parte, sem números de página nem notas com URL', () => {
  const txt = [
    '                         Projeto de Lei n.º 300/XVII/1.ª',
    '',
    '                                Exposição de motivos',
    '',
    'A Lei n.º 30/2021, de 21 de maio, que entrou em vigor em 20 de junho de 2021,',
    'aprovou medidas especiais de contratação pública e eliminou o visto',
    '',
    '                                          1',
    '\fprévio do Tribunal de Contas.',
    '',
    '1 https://www.tcontas.pt/relatorio.pdf',
    '',
    'Pelo exposto, e ao abrigo das disposições constitucionais e regimentais aplicáveis, a',
    'abaixo assinada Deputada apresenta o seguinte Projeto de Lei:',
    '',
    '                                       Artigo 1.º',
    '                                        Objeto',
    'A presente lei procede à quarta alteração à Lei n.º 30/2021.',
  ].join('\n')
  const paras = paragraphsFromPlainText(txt)
  const r = extractTextoAr(paras)
  assert.deepEqual(r.exposicao, [
    'A Lei n.º 30/2021, de 21 de maio, que entrou em vigor em 20 de junho de 2021, aprovou medidas especiais de contratação pública e eliminou o visto prévio do Tribunal de Contas.',
  ])
  assert.deepEqual(r.artigos, [{ n: 1, epigrafe: 'Objeto' }])
  assert.equal(r.objeto, 'A presente lei procede à quarta alteração à Lei n.º 30/2021.')
})

test('URLs: .docx original via doc.docx (https) com PDF da AR como alternativa; .doc/.pdf só PDF', () => {
  const docx = 'http://app.parlamento.pt/webutils/docs/doc.pdf?path=abc&fich=x.docx&Inline=true'
  assert.equal(formatoTexto(docx), 'docx')
  assert.deepEqual(urlsDescarga(docx), [
    { formato: 'docx', url: 'https://app.parlamento.pt/webutils/docs/doc.docx?path=abc&fich=x.docx&Inline=true' },
    { formato: 'pdf', url: 'https://app.parlamento.pt/webutils/docs/doc.pdf?path=abc&fich=x.docx&Inline=true' },
  ])
  const doc = 'http://app.parlamento.pt/webutils/docs/doc.pdf?path=abc&fich=x.DOC&Inline=true'
  assert.equal(formatoTexto(doc), 'doc')
  assert.deepEqual(urlsDescarga(doc).map((u) => u.formato), ['pdf'])
  assert.deepEqual(urlsDescarga(''), [])
})

test('parágrafos muito longos são cortados numa frase e marcados com […]', () => {
  const longo = 'Frase de teste com conteúdo. '.repeat(200)
  const r = extractTextoAr(P('Exposição de motivos', longo, 'Assim:'))
  assert.ok(r.exposicao[0].length <= 3_010)
  assert.ok(r.exposicao[0].endsWith('[…]'))
})

test('deliberação da Comissão Permanente: o parágrafo “delibera” é o dispositivo', () => {
  const r = extractTextoAr(
    P('PROJETO DE DELIBERAÇÃO N.º 33/XVII/1.ª', 'Convocação do Plenário da Assembleia da República',
      'Encontrando-se a Assembleia da República fora do período normal de funcionamento, tendo sido apresentada uma moção de censura ao Governo, importa convocar o Plenário.',
      'A Comissão Permanente da Assembleia da República delibera, nos termos da alínea c) do n.º 3 do artigo 179.º da Constituição, convocar o Plenário.',
      'Palácio de São Bento, 3 de setembro de 2026.'),
  )
  assert.equal(r.estado, 'ok')
  assert.equal(r.exposicao.length, 1)
  assert.match(r.dispositivo[0], /^A Comissão Permanente/)
  assert.equal(r.transicao, null)
})

test('PDF com referências em rodapé (“Título | Jornal”) e exposição em linha', () => {
  const paras = paragraphsFromPlainText(
    ['Exposição de motivos: A economia circular assenta em princípios gerais de redução do desperdício.', '', 'Compreender a economia circular | Conselho Europeu', '', 'Assim, ao abrigo das disposições constitucionais e regimentais aplicáveis, recomenda-se ao Governo que:', '', '1. Transponha a diretiva.'].join('\n'),
  )
  const r = extractTextoAr(paras)
  assert.deepEqual(r.exposicao, ['A economia circular assenta em princípios gerais de redução do desperdício.'])
  assert.deepEqual(r.dispositivo, ['1. Transponha a diretiva.'])
})

test('“Recomendar ao Governo que:” isolado passa a introdução', () => {
  const r = extractTextoAr(P('Exposição de motivos', 'Os Governos continuam a decidir sobre as Regiões sem as ouvir, o que tem de mudar.', 'Assim, ao abrigo das disposições constitucionais e regimentais aplicáveis, a Assembleia resolve:', 'Recomendar ao Governo que:', 'Ouça as Regiões;', 'Publique os pareceres.'))
  assert.equal(r.transicao, 'Recomendar ao Governo que:')
  assert.deepEqual(r.dispositivo, ['Ouça as Regiões;', 'Publique os pareceres.'])
})
