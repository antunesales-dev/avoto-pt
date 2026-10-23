/**
 * Comunicados oficiais — portugal.gov.pt.
 * - Comunicados do CM: sitemap + página HTML.
 * - Notícias: índice de pesquisa público do próprio portal (o mesmo que a página
 *   /gc25/comunicacao/noticias usa no browser), paginado por data. O sitemap só lista o índice.
 * Sem AI. Sem X. Upsert por URL canónica. Pedidos espaçados (delay) e identificados (UA).
 * Fonte: portugal.gov.pt — o aviso legal permite reprodução para fins não comerciais citando a fonte;
 * guardamos texto e metadados, NÃO as fotografias (Lusa).
 */
import { temaFromGov } from './govTemas.ts'

const UA = 'A-Voto/1.0 (+https://avoto.pt; civic open data; official sources only)'
const SITEMAP = 'https://portugal.gov.pt/sitemap.xml'
const ORIGIN = 'https://portugal.gov.pt'

export type MappedComunicado = {
  id: string
  titulo: string
  resumo: string
  /** Texto principal para ler na app (extraído da fonte oficial). */
  corpo: string
  url_oficial: string
  publicado_em: string
  tipo: 'noticia' | 'comunicado_cm' | 'intervencao' | 'nomeacao' | 'outro'
  source: string
  /** card:tags / card:areas / card:officials / card:roles do portal */
  tags: string[]
  areas: string[]
  officials: string[]
  roles: string[]
  /** Tema canónico derivado da área governativa (ver govTemas.ts) */
  tema: string | null
  meta: Record<string, unknown>
}

export const NEWS_TEMPLATE_ID = '{DC3CC8F2-1004-46C7-827C-CAD36919C735}'
export const DEFAULT_SEARCH_ENDPOINT = 'https://discover-euc1.sitecorecloud.io/discover/v2/135545443'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw, ORIGIN)
    u.hash = ''
    let path = u.pathname.replace(/\/+$/, '') || '/'
    // prefer no /pt/ prefix for canonical gc25 paths
    path = path.replace(/^\/pt\//, '/')
    return `https://portugal.gov.pt${path}`
  } catch {
    return raw.split('?')[0].replace(/\/+$/, '')
  }
}

function slugFromUrl(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/, '')
  return path.split('/').filter(Boolean).pop() || 'item'
}

async function stableId(url: string): Promise<string> {
  const raw = normalizeUrl(url).toLowerCase()
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `gov-${hex.slice(0, 28)}`
}

export function classifyTipo(url: string): MappedComunicado['tipo'] {
  if (url.includes('comunicado-do-conselho-de-ministros') || url.includes('/comunicados-do-conselho-de-ministros/')) {
    return 'comunicado_cm'
  }
  if (url.includes('/intervencoes/')) return 'intervencao'
  if (url.includes('/noticias/')) return 'noticia'
  if (url.includes('/nomeacoes/')) return 'nomeacao'
  return 'outro'
}

/** Paths que são páginas-índice, não artigos. */
function isListingUrl(url: string): boolean {
  const path = normalizeUrl(url).replace(/^https?:\/\/[^/]+/, '')
  const bad = [
    /\/noticias\/?$/,
    /\/comunicados\/?$/,
    /\/comunicacao\/?$/,
    /\/multimedia\/?$/,
    /\/documentos\/?$/,
    /\/temas\/?$/,
    /\/intervencoes\/?$/,
    /\/comunicados-do-conselho-de-ministros\/?$/,
    /\/,-w-,?$/,
  ]
  return bad.some((re) => re.test(path))
}

/** Páginas de nomeações (cargos/remunerações): não são notícias → excluídas dos comunicados. */
export function isNomeacaoUrl(url: string): boolean {
  return /\/governo\/nomeacoes\//.test(url)
}

export function isGc25ArticleUrl(url: string): boolean {
  if (!url.includes('portugal.gov.pt')) return false
  if (!url.includes('/gc25/')) return false
  if (isListingUrl(url)) return false
  if (isNomeacaoUrl(url)) return false
  // Artigos: CM, notícias com slug, intervenções (gc25). Nomeações ficam de fora.
  if (url.includes('/comunicados-do-conselho-de-ministros/')) {
    // aceita slug ou id numérico; rejeita só o índice (já filtrado por isListingUrl)
    return url.split('/comunicados-do-conselho-de-ministros/')[1]?.length > 0
  }
  return (
    url.includes('/comunicacao/noticias/') ||
    url.includes('/comunicacao/intervencoes/') ||
    url.includes('/comunicacao/comunicados/')
  )
}

/** `card:tags` etc. vêm como "a | b | c". */
export function parseCardList(raw: string | null | undefined): string[] {
  if (!raw) return []
  const out: string[] = []
  for (const part of decodeEntities(String(raw)).split('|')) {
    const v = part.replace(/\s+/g, ' ').trim()
    if (v && !out.includes(v)) out.push(v)
  }
  return out
}

function metaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `(?:property|name)="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="([^"]*)"`,
      'i',
    )
    const m = html.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&Ccedil;/gi, 'Ç')
    .replace(/&atilde;/gi, 'ã')
    .replace(/&otilde;/gi, 'õ')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&agrave;/gi, 'à')
    .replace(/&ecirc;/gi, 'ê')
    .replace(/&ocirc;/gi, 'ô')
    .replace(/&Aacute;/gi, 'Á')
    .replace(/&Eacute;/gi, 'É')
    .replace(/&Iacute;/gi, 'Í')
    .replace(/&Oacute;/gi, 'Ó')
    .replace(/&Uacute;/gi, 'Ú')
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCharCode(Number(n))
      } catch {
        return ''
      }
    })
}

function stripHtml(s: string): string {
  return decodeEntities(
    s
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

/** HTML de conteúdo → texto legível com parágrafos (para a app). */
function htmlToCorpo(html: string): string {
  let h = decodeEntities(html)
  h = h
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
  return h
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Extrai o corpo principal do HTML (Sitecore/Next Content field ou fallback).
 */
function extractCorpoFromPage(html: string): string {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (m) {
    try {
      const data = JSON.parse(m[1])
      const fields = data?.props?.pageProps?.layoutData?.sitecore?.route?.fields
      const content = fields?.Content?.value
      if (typeof content === 'string' && content.length > 40) {
        return htmlToCorpo(content).slice(0, 50000)
      }
      // fallback: contextItem.content
      const walk = (o: unknown): string | null => {
        if (!o || typeof o !== 'object') return null
        if (Array.isArray(o)) {
          for (const x of o) {
            const r = walk(x)
            if (r) return r
          }
          return null
        }
        const rec = o as Record<string, unknown>
        if (typeof rec.value === 'string' && rec.value.includes('<p') && rec.value.length > 200) {
          // prefer Content-like
          return htmlToCorpo(rec.value).slice(0, 50000)
        }
        for (const v of Object.values(rec)) {
          const r = walk(v)
          if (r && r.length > 200) return r
        }
        return null
      }
      const found = walk(fields)
      if (found && found.length > 80) return found
    } catch {
      /* ignore */
    }
  }
  // HTML visível: juntar <p> longos (ignora nav/footer curtos)
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((x) => stripHtml(x[1]))
    .filter((p) => p.length > 50 && !/cookie|navegação no sítio/i.test(p))
  if (paras.length) return paras.join('\n\n').slice(0, 50000)
  return ''
}

function parseDate(raw: string | null | undefined, fallbackLastmod?: string): string | null {
  if (raw) {
    const d = String(raw).slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
    const t = Date.parse(raw)
    if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10)
  }
  if (fallbackLastmod) {
    const d = String(fallbackLastmod).slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  }
  return null
}

export async function listCandidateUrlsFromSitemap(
  limit = 80,
): Promise<{ url: string; lastmod: string | null }[]> {
  const res = await fetch(SITEMAP, { headers: { 'User-Agent': UA, Accept: 'application/xml' } })
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`)
  const xml = await res.text()
  const re =
    /<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]*)<\/lastmod>)?/gi
  const out: { url: string; lastmod: string | null }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const url = normalizeUrl(m[1].trim())
    if (!isGc25ArticleUrl(url)) continue
    out.push({ url, lastmod: m[2]?.trim() || null })
  }
  // sort by lastmod desc when present
  out.sort((a, b) => String(b.lastmod || '').localeCompare(String(a.lastmod || '')))
  const seen = new Set<string>()
  const uniq: { url: string; lastmod: string | null }[] = []
  for (const row of out) {
    if (seen.has(row.url)) continue
    seen.add(row.url)
    uniq.push(row)
    if (uniq.length >= limit) break
  }
  return uniq
}

export async function fetchComunicadoPage(
  url: string,
  lastmod?: string | null,
): Promise<MappedComunicado | null> {
  const url_oficial = normalizeUrl(url)
  if (!isGc25ArticleUrl(url_oficial)) return null

  const res = await fetch(url_oficial, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
  })
  if (!res.ok) return null
  const html = await res.text()

  let titulo =
    metaContent(html, ['og:title']) ||
    (html.match(/<title[^>]*>([^<]+)/i)?.[1] || '').replace(/\s*-\s*XXV Governo.*$/i, '').trim()
  titulo = stripHtml(titulo).slice(0, 400)
  if (!titulo || titulo.length < 8) {
    titulo = slugFromUrl(url_oficial).replace(/-/g, ' ').slice(0, 200)
  }

  const corpo = extractCorpoFromPage(html)
  let resumo = stripHtml(
    metaContent(html, ['og:description', 'description']) || '',
  ).slice(0, 800)
  if (!resumo && corpo) {
    resumo = corpo.replace(/\s+/g, ' ').slice(0, 400)
  }

  const publicado_em = parseDate(
    metaContent(html, ['card:date', 'article:published_time', 'date']),
    lastmod || undefined,
  )
  if (!publicado_em) return null

  const tipo = classifyTipo(url_oficial)
  const id = await stableId(url_oficial)
  const tags = parseCardList(metaContent(html, ['card:tags']))
  const areas = parseCardList(metaContent(html, ['card:areas']))
  const officials = parseCardList(metaContent(html, ['card:officials']))
  const roles = parseCardList(metaContent(html, ['card:roles']))

  return {
    id,
    titulo,
    resumo,
    corpo,
    url_oficial,
    publicado_em,
    tipo,
    source: 'portugal.gov.pt',
    tags,
    areas,
    officials,
    roles,
    tema: areas.length || tags.length ? temaFromGov({ areas, tags, titulo }) : null,
    meta: {
      lastmod: lastmod || null,
      slug: slugFromUrl(url_oficial),
      corpo_chars: corpo.length,
      discovery: 'sitemap',
      card_date: metaContent(html, ['card:date']),
    },
  }
}

// ---------------------------------------------------------------------------
// Notícias: índice de pesquisa do portal (paginado, ordenado por data desc)
// ---------------------------------------------------------------------------

export type SearchItem = {
  url?: string
  title?: string
  name?: string
  description?: string
  content?: string
  date?: string
  areas?: string[]
  tags?: string[]
  officials?: string[]
  roles?: string[]
  priority_tag?: string
  priority_area?: string
  category?: string
  template?: string
  gc?: string
}

/** Item do índice → linha `comunicados` (sem I/O além do hash). */
export async function mapSearchItem(it: SearchItem): Promise<MappedComunicado | null> {
  if (!it?.url) return null
  const url_oficial = normalizeUrl(it.url)
  if (!isGc25ArticleUrl(url_oficial)) return null
  const publicado_em = parseDate(it.date || null)
  if (!publicado_em) return null
  const titulo = stripHtml(String(it.title || it.name || '')).trim().slice(0, 400) ||
    slugFromUrl(url_oficial).replace(/-/g, ' ')
  // O índice devolve parágrafos separados por \n → parágrafos da app (\n\n)
  const corpo = String(it.content || '')
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((p) => p.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 50000)
  const resumo = stripHtml(String(it.description || '')).slice(0, 800) ||
    corpo.replace(/\s+/g, ' ').slice(0, 400)
  const clean = (xs?: string[]) => [...new Set((xs || []).map((x) => String(x).trim()).filter(Boolean))]
  const areas = clean(it.areas)
  const tags = clean(it.tags)
  return {
    id: await stableId(url_oficial),
    titulo,
    resumo,
    corpo,
    url_oficial,
    publicado_em,
    tipo: classifyTipo(url_oficial),
    source: 'portugal.gov.pt',
    tags,
    areas,
    officials: clean(it.officials),
    roles: clean(it.roles),
    tema: temaFromGov({ areas, tags, priorityTag: it.priority_tag || null, titulo }),
    meta: {
      slug: slugFromUrl(url_oficial),
      corpo_chars: corpo.length,
      discovery: 'search_index',
      card_date: it.date || null,
      priority_tag: it.priority_tag || null,
      priority_area: it.priority_area || null,
    },
  }
}

export type NewsDiscoveryOptions = {
  /** Chave pública do índice (a mesma que o portal envia do browser). Sem chave → desligado. */
  searchKey: string
  endpoint?: string
  /** Só notícias com data >= since (YYYY-MM-DD). */
  since: string
  maxItems?: number
  pageSize?: number
  delayMs?: number
  fetchImpl?: typeof fetch
}

/**
 * Descobre notícias por ordem de data (mais recentes primeiro) até `since`.
 * Pedidos sequenciais com pausa; para à primeira página mais antiga que `since`.
 */
export async function discoverNoticias(opts: NewsDiscoveryOptions): Promise<{
  items: MappedComunicado[]
  total: number | null
  requests: number
  errors: string[]
}> {
  const f = opts.fetchImpl || fetch
  const endpoint = opts.endpoint || DEFAULT_SEARCH_ENDPOINT
  const pageSize = Math.max(10, Math.min(50, opts.pageSize || 50))
  const maxItems = Math.max(1, Math.min(2000, opts.maxItems || 400))
  const delayMs = Math.max(0, opts.delayMs ?? 1500)
  const items: MappedComunicado[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  let total: number | null = null
  let requests = 0

  for (let offset = 0; offset < 5000 && items.length < maxItems; offset += pageSize) {
    if (requests > 0 && delayMs) await sleep(delayMs)
    const body = {
      context: { page: { uri: '/gc25/comunicacao/noticias' }, locale: { language: 'pt', country: 'pt' } },
      widget: {
        items: [
          {
            rfk_id: 'rfkid_7',
            entity: 'ceger',
            search: {
              content: {},
              offset,
              limit: pageSize,
              sort: { value: [{ name: 'date_descending' }] },
              filter: {
                type: 'and',
                filters: [
                  { type: 'eq', name: 'gc', value: 'gc25' },
                  { type: 'eq', name: 'template', value: NEWS_TEMPLATE_ID },
                ],
              },
            },
          },
        ],
      },
    }
    let json: { widgets?: { total_item?: number; content?: SearchItem[] }[] } | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      requests++
      try {
        const res = await f(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: opts.searchKey, 'User-Agent': UA },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        json = await res.json()
        break
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (attempt === 3) errors.push(`search offset=${offset}: ${msg}`)
        else await sleep(delayMs * attempt + 500)
      }
    }
    const w = json?.widgets?.[0]
    if (!w) break
    total = typeof w.total_item === 'number' ? w.total_item : total
    const page = w.content || []
    if (!page.length) break
    let older = false
    for (const it of page) {
      const row = await mapSearchItem(it)
      if (!row) continue
      if (row.publicado_em < opts.since) {
        older = true
        continue
      }
      if (seen.has(row.id)) continue
      seen.add(row.id)
      items.push(row)
      if (items.length >= maxItems) break
    }
    if (older || page.length < pageSize) break
  }
  return { items, total, requests, errors }
}

export async function fetchComunicados(limit = 60, delayMs = 800): Promise<{
  items: MappedComunicado[]
  candidates: number
  errors: string[]
}> {
  const target = Math.max(1, Math.min(120, limit))
  const candidates = await listCandidateUrlsFromSitemap(Math.min(200, target * 2))
  const items: MappedComunicado[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  let n = 0
  for (const c of candidates) {
    if (items.length >= target) break
    if (n++ > 0 && delayMs) await sleep(delayMs)
    try {
      const row = await fetchComunicadoPage(c.url, c.lastmod)
      if (!row) continue
      if (seen.has(row.id)) continue
      seen.add(row.id)
      items.push(row)
    } catch (e) {
      errors.push(`${c.url}: ${e instanceof Error ? e.message : String(e)}`)
      if (errors.length > 15) break
    }
  }

  return { items, candidates: candidates.length, errors }
}
