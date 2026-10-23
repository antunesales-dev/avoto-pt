// Deno: o extrator partilhado corre igual em Deno (pnpm test:deno).
import { assertEquals } from 'jsr:@std/assert@1'
import { extractTextoAr, urlsDescarga } from './ar-texto.js'

Deno.test('ar-texto: lei com exposição, objeto e articulado de topo', () => {
  const r = extractTextoAr(
    ['Exposição de motivos', 'Motivo longo e concreto para alterar a lei.', 'Assim:', 'Artigo 1.º', 'Objeto', 'A presente lei altera X.', 'Artigo 2.º', 'Entrada em vigor', 'Amanhã.'].map((t) => ({ t })),
  )
  assertEquals(r.estado, 'ok')
  assertEquals(r.exposicao, ['Motivo longo e concreto para alterar a lei.'])
  assertEquals(r.objeto, 'A presente lei altera X.')
  assertEquals(r.artigos, [{ n: 1, epigrafe: 'Objeto' }, { n: 2, epigrafe: 'Entrada em vigor' }])
})

Deno.test('ar-texto: URLs https', () => {
  assertEquals(urlsDescarga('http://app.parlamento.pt/webutils/docs/doc.pdf?path=a&fich=b.pdf&Inline=true')[0].url.startsWith('https://'), true)
})
