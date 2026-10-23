/**
 * SEO sem SSR: as mesmas regras de <title>/description/Open Graph servem
 *  - o pré-render no build (scripts/prerender-meta.mjs → dist/<rota>.html), e
 *  - as Pages Functions das fichas (functions/{iniciativas,despesa,comunicados}/[id].js).
 * JS puro, sem dependências (corre em Node e em Workers).
 */

export const SITE_NAME = 'A Voto — Bancada Cidadã'
export const SITE_URL = 'https://avoto.pt'
export const OG_IMAGE = '/icons/icon-512x512.png'

const DEFAULT_DESC =
  'Plataforma cívica independente, neutra e open source: compara o voto dos cidadãos registados com o voto dos partidos na Assembleia da República.'

/** Rotas estáticas pré-renderizadas. `title` = meta.title do router (src/router/routes.js). */
export const STATIC_ROUTES = {
  '/': { title: null, description: DEFAULT_DESC },
  '/iniciativas': {
    title: 'Iniciativas',
    description:
      'Projetos e propostas de lei da Assembleia da República, com o estado, o voto de cada partido e o voto dos cidadãos registados.',
  },
  '/digest': {
    title: 'Resumo do dia',
    description: 'O que aconteceu em cada dia na Assembleia da República e na despesa pública, com datas oficiais.',
  },
  '/despesa': {
    title: 'Despesa pública',
    description:
      'Contratos públicos do Portal Base: montante, entidade adjudicante (nome canónico por NIF), data de publicação e link oficial.',
  },
  '/contratos': {
    title: 'Contratos ≥ 100 000 €',
    description:
      'Os contratos públicos de 100 000 € ou mais do Portal Base. É uma vista de Despesa, não outra fonte.',
  },
  '/comunicados': {
    title: 'Comunicados',
    description: 'Comunicados e notícias oficiais do Governo (portugal.gov.pt), por tema e ligados às iniciativas da AR. Só consulta, sem voto.',
  },
  '/comparacao': {
    title: 'Comparação',
    description: 'Compara o voto de cada partido na AR com o voto dos cidadãos registados na A Voto.',
  },
  '/metricas': { title: 'Métricas', description: 'Números públicos da plataforma: iniciativas, despesa, comunicados e participação.' },
  '/como-funciona': { title: 'Como funciona', description: 'Como a A Voto importa os dados oficiais e como funciona o voto cidadão.' },
  '/dados': { title: 'Fontes de dados', description: 'De onde vêm os dados da A Voto, com que datas e com que frequência são atualizados.' },
  '/financiamento': { title: 'Financiamento', description: 'Como a A Voto é financiada, com transparência total.' },
  '/porque': { title: 'O porquê', description: 'Porque existe a A Voto e o que pretende.' },
  '/sobre': { title: 'Sobre', description: 'Quem faz a A Voto, código aberto e princípios de neutralidade.' },
  '/privacidade': { title: 'Privacidade', description: 'Política de privacidade da A Voto (RGPD).' },
  '/termos': { title: 'Termos de uso', description: 'Termos de uso da A Voto.' },
  '/cookies': { title: 'Cookies', description: 'Que cookies e armazenamento local a A Voto usa.' },
  '/direitos': { title: 'Direitos RGPD', description: 'Como exercer os teus direitos RGPD na A Voto.' },
}

// Igual a estadosLabel (src/data/partidos.js), incl. os estados novos do plano A.
const ESTADOS = {
  aprovado: 'Aprovado',
  aprovado_generalidade: 'Aprovado na generalidade',
  rejeitado: 'Rejeitado',
  em_discussao: 'Em discussão',
  arquivado: 'Arquivado',
  retirado: 'Retirado',
}

export function pageTitle(title) {
  return title ? `${title} · ${SITE_NAME}` : SITE_NAME
}

export function truncate(s, n) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t
  const cut = t.slice(0, n - 1)
  const sp = cut.lastIndexOf(' ')
  return `${(sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–—-]+$/, '')}…`
}

function money(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function dataPt(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : null
}

export function staticMeta(path) {
  const r = STATIC_ROUTES[path]
  if (!r) return null
  return { title: pageTitle(r.title), description: r.description, path, type: 'website' }
}

/** Meta de uma ficha a partir da linha da BD (ou null se não houver linha). */
export function recordMeta(kind, row, path) {
  if (!row) return null
  if (kind === 'iniciativa') {
    const head = [row.id_oficial, row.titulo].filter(Boolean).join(' — ')
    const estado = ESTADOS[row.estado] || null
    const bits = [
      estado ? `Estado: ${estado}.` : null,
      row.tema && row.tema !== 'Outros' ? `Tema: ${row.tema}.` : null,
      row.data_entrada ? `Entrada na AR a ${dataPt(row.data_entrada)}.` : null,
    ].filter(Boolean)
    const corpo = row.descricao_oficial && row.descricao_oficial !== row.titulo ? row.descricao_oficial : ''
    const description = truncate(
      [bits.join(' '), corpo, 'Vê o voto de cada partido e o voto dos cidadãos.'].filter(Boolean).join(' '),
      200,
    )
    return { title: pageTitle(truncate(head, 110)), description, path, type: 'article', h1: head }
  }
  if (kind === 'despesa') {
    const m = money(row.montante_eur)
    const head = [row.titulo, m].filter(Boolean).join(' — ')
    const description = truncate(
      `Contrato público${m ? ` de ${m}` : ''}${row.entidade ? `, ${row.entidade}` : ''}${
        row.data_publicacao ? `, publicado a ${dataPt(row.data_publicacao)}` : ''
      } no Portal Base.`,
      200,
    )
    return { title: pageTitle(truncate(head, 110)), description, path, type: 'article', h1: head }
  }
  if (kind === 'comunicado') {
    // Plano B: nomeações estão ocultas no site → meta genérica da secção.
    if (row.tipo === 'nomeacao') return null
    const lead = row.tema ? `${row.tema}. ` : ''
    const description = truncate(`${lead}${row.resumo || row.titulo}`, 200)
    return { title: pageTitle(truncate(row.titulo, 110)), description, path, type: 'article', h1: row.titulo }
  }
  return null
}

/** Meta genérica da secção quando a ficha não existe / a BD não responde. */
export function fallbackMeta(kind, path) {
  const section = { iniciativa: '/iniciativas', despesa: '/despesa', comunicado: '/comunicados' }[kind]
  const m = staticMeta(section) || staticMeta('/')
  return { ...m, path }
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Aplica a meta ao HTML do shell da SPA (minificado pelo Quasar).
 * Substitui <title> e description, remove og/twitter/canonical anteriores e
 * acrescenta os novos + um <noscript> com o título (crawlers sem JS).
 */
export function applyMeta(html, meta, { siteUrl = SITE_URL } = {}) {
  const url = siteUrl.replace(/\/$/, '') + (meta.path === '/' ? '/' : meta.path)
  const t = escapeHtml(meta.title)
  const d = escapeHtml(meta.description)
  const tags = [
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
    `<meta property="og:locale" content="pt_PT">`,
    `<meta property="og:type" content="${meta.type || 'website'}">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:image" content="${escapeHtml(siteUrl.replace(/\/$/, '') + OG_IMAGE)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${t}">`,
    `<meta name="twitter:description" content="${d}">`,
  ].join('')
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`)
    .replace(/<meta\s+name=["']?description["']?\s[^>]*>/i, `<meta name="description" content="${d}">`)
    .replace(/<meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<noscript data-seo>[\s\S]*?<\/noscript>/gi, '')
  if (!/<meta\s+name="description"/i.test(out)) out = out.replace(/<\/title>/i, `</title><meta name="description" content="${d}">`)
  out = out.replace(/<\/head>/i, `${tags}</head>`)
  const h1 = escapeHtml(meta.h1 || meta.title)
  out = out.replace(/<body([^>]*)>/i, `<body$1><noscript data-seo><h1>${h1}</h1><p>${d}</p></noscript>`)
  return out
}
