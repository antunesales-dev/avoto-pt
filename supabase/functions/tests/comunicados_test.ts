// deno test supabase/functions/tests/  (sem rede: fetch simulado)
import { assert, assertEquals } from 'jsr:@std/assert@1'
import {
  classifyTipo,
  discoverNoticias,
  isGc25ArticleUrl,
  mapSearchItem,
  normalizeUrl,
  parseCardList,
} from '../_shared/comunicados.ts'
import { TEMAS_CANONICOS, temaFromGov } from '../_shared/govTemas.ts'

const HERANCAS = '/pt/gc25/comunicacao/noticias/habitacao-resolver-herancas-indivisas-para-colocar-mais-casas-no-mercado-'

Deno.test('nomeações ficam fora dos comunicados', () => {
  assert(!isGc25ArticleUrl('https://portugal.gov.pt/gc25/governo/nomeacoes/ministro-da-economia-e-coesao-territorial'))
  assertEquals(classifyTipo('https://portugal.gov.pt/gc25/governo/nomeacoes/x'), 'nomeacao')
  assert(isGc25ArticleUrl(normalizeUrl('https://portugal.gov.pt' + HERANCAS)))
  assert(!isGc25ArticleUrl('https://portugal.gov.pt/gc25/comunicacao/noticias'))
})

Deno.test('normalizeUrl tira /pt/ e barra final', () => {
  assertEquals(
    normalizeUrl('https://portugal.gov.pt/pt/gc25/comunicacao/noticias/abc/#x'),
    'https://portugal.gov.pt/gc25/comunicacao/noticias/abc',
  )
})

Deno.test('parseCardList separa por | e decodifica entidades', () => {
  assertEquals(parseCardList('habitação | transportes |  AIMA | AIMA'), ['habitação', 'transportes', 'AIMA'])
  assertEquals(parseCardList('Ci&ecirc;ncia'), ['Ciência'])
  assertEquals(parseCardList(null), [])
})

Deno.test('tema: área específica, área genérica + tag, Reforma do Estado transversal', () => {
  assertEquals(temaFromGov({ areas: ['Saúde'] }), 'Saúde')
  assertEquals(temaFromGov({ areas: ['Presidência'], tags: ['habitação', 'AIMA'], priorityTag: 'habitação' }), 'Habitação')
  assertEquals(temaFromGov({ areas: ['Infraestruturas e Habitação'], tags: ['ferrovia'] }), 'Transportes e Infraestruturas')
  assertEquals(temaFromGov({ areas: ['Infraestruturas e Habitação'], tags: ['habitação'] }), 'Habitação')
  assertEquals(temaFromGov({ areas: ['Reforma do Estado', 'Saúde'] }), 'Saúde')
  assertEquals(temaFromGov({ areas: ['Primeiro-Ministro'], tags: ['Ucrânia'] }), 'Europa e Mundo')
  assertEquals(temaFromGov({ areas: ['Primeiro-Ministro'], titulo: 'Apoio ao gasóleo agrícola prolongado' }), 'Agricultura e Mar')
  // "iva" não pode apanhar "legislativa"
  assertEquals(temaFromGov({ areas: [], titulo: 'Proposta legislativa relativa ao poder local' }), 'Estado, Autarquias e Instituições')
  for (const a of ['Finanças', 'Justiça', 'Defesa Nacional', 'Negócios Estrangeiros']) {
    assert((TEMAS_CANONICOS as readonly string[]).includes(temaFromGov({ areas: [a] })))
  }
})

Deno.test('mapSearchItem: notícia do índice → linha com card:* e parágrafos', async () => {
  const row = await mapSearchItem({
    url: HERANCAS,
    title: 'Habitação: resolver heranças indivisas',
    description: 'Conselho de Ministros aprova alterações ao direito sucessório',
    content: 'Primeiro parágrafo.\nSegundo parágrafo.',
    date: '2026-10-22T20:11:00Z',
    areas: ['Presidência'],
    tags: ['habitação', 'AIMA'],
    officials: ['António Leitão Amaro'],
    roles: ['Ministro'],
    priority_tag: 'habitação',
  })
  assert(row)
  assertEquals(row.tipo, 'noticia')
  assertEquals(row.publicado_em, '2026-10-22')
  assertEquals(row.tema, 'Habitação')
  assertEquals(row.officials, ['António Leitão Amaro'])
  assertEquals(row.corpo, 'Primeiro parágrafo.\n\nSegundo parágrafo.')
  assert(row.id.startsWith('gov-'))
  assertEquals(row.url_oficial, 'https://portugal.gov.pt' + HERANCAS.replace('/pt/', '/'))
})

Deno.test('discoverNoticias pagina e pára na primeira notícia anterior a `since`', async () => {
  const dates = ['2026-10-22', '2026-10-20', '2026-10-10', '2026-09-30', '2026-08-01', '2026-07-01']
  const all = dates.map((d, i) => ({ url: `/pt/gc25/comunicacao/noticias/n-${i}`, title: `Notícia número ${i}`, date: `${d}T10:00:00Z`, areas: ['Saúde'] }))
  const bodies: { offset: number; limit: number }[] = []
  const fakeFetch = (async (_u: string, init: RequestInit) => {
    const b = JSON.parse(String(init.body))
    const s = b.widget.items[0].search
    bodies.push({ offset: s.offset, limit: s.limit })
    assertEquals((init.headers as Record<string, string>).Authorization, 'k')
    const page = all.slice(s.offset, s.offset + s.limit)
    return new Response(JSON.stringify({ widgets: [{ total_item: all.length, content: page }] }), { status: 200 })
  }) as typeof fetch
  const r = await discoverNoticias({ searchKey: 'k', since: '2026-09-15', pageSize: 10, delayMs: 0, fetchImpl: fakeFetch })
  // pageSize mínimo é 10 → 1 pedido chega
  assertEquals(r.items.map((x) => x.publicado_em), ['2026-10-22', '2026-10-20', '2026-10-10', '2026-09-30'])
  assertEquals(r.requests, 1)
  assertEquals(bodies[0], { offset: 0, limit: 10 })
})

Deno.test('discoverNoticias: erro HTTP repetido fica em errors, sem rebentar', async () => {
  let n = 0
  const failing = (async () => {
    n++
    return new Response('bad gateway', { status: 502 })
  }) as typeof fetch
  const r = await discoverNoticias({ searchKey: 'k', since: '2026-01-01', delayMs: 0, fetchImpl: failing })
  assertEquals(r.items.length, 0)
  assertEquals(n, 3)
  assert(r.errors[0].includes('HTTP 502'))
})

Deno.test('govTemas usa exactamente os 16 temas canónicos de _shared/temas.js', async () => {
  const { TEMAS, TEMA_OUTROS } = await import('../_shared/temas.js')
  assertEquals([...TEMAS_CANONICOS], TEMAS.filter((t: string) => t !== TEMA_OUTROS))
  assertEquals(TEMAS_CANONICOS.length, 16)
})
