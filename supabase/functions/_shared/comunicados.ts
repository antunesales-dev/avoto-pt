/**
 * Comunicados oficiais — portugal.gov.pt (sitemap + página HTML).
 * Sem AI. Sem X. Upsert por URL canónica.
 */

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
  tipo: 'noticia' | 'comunicado_cm' | 'intervencao' | 'outro'
  source: string
  meta: Record<string, unknown>
}

function normalizeUrl(raw: string): string {
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

function classifyTipo(url: string): MappedComunicado['tipo'] {
  if (url.includes('comunicado-do-conselho-de-ministros') || url.includes('/comunicados-do-conselho-de-ministros/')) {
    return 'comunicado_cm'
  }
  if (url.includes('/intervencoes/')) return 'intervencao'
  if (url.includes('/noticias/')) return 'noticia'
  if (url.includes('/nomeacoes/')) return 'outro'
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

function isGc25ArticleUrl(url: string): boolean {
  if (!url.includes('portugal.gov.pt')) return false
  if (!url.includes('/gc25/')) return false
  if (isListingUrl(url)) return false
  // Artigos: CM, notícias com slug, intervenções, nomeações (gc25)
  if (url.includes('/comunicados-do-conselho-de-ministros/')) {
    // aceita slug ou id numérico; rejeita só o índice (já filtrado por isListingUrl)
    return url.split('/comunicados-do-conselho-de-ministros/')[1]?.length > 0
  }
  return (
    url.includes('/comunicacao/noticias/') ||
    url.includes('/comunicacao/intervencoes/') ||
    url.includes('/comunicacao/comunicados/') ||
    url.includes('/governo/nomeacoes/')
  )
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

  return {
    id,
    titulo,
    resumo,
    corpo,
    url_oficial,
    publicado_em,
    tipo,
    source: 'portugal.gov.pt',
    meta: {
      lastmod: lastmod || null,
      slug: slugFromUrl(url_oficial),
      corpo_chars: corpo.length,
    },
  }
}

export async function fetchComunicados(limit = 60): Promise<{
  items: MappedComunicado[]
  candidates: number
  errors: string[]
}> {
  const target = Math.max(1, Math.min(120, limit))
  const candidates = await listCandidateUrlsFromSitemap(Math.min(200, target * 2))
  const items: MappedComunicado[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  for (const c of candidates) {
    if (items.length >= target) break
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
