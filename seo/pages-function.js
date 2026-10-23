/**
 * Cloudflare Pages Function partilhada: devolve o shell da SPA com <title>/og
 * da ficha pedida. A SPA continua a renderizar no browser como antes.
 * Se a BD não responder em ~2,5 s, serve a meta genérica da secção (nunca falha a página).
 */
import { SITE_URL, applyMeta, fallbackMeta, recordMeta } from './meta.js'

const TABLE = {
  iniciativa: { table: 'iniciativas', select: 'id,id_oficial,titulo,estado,tema,data_entrada,descricao_oficial' },
  despesa: { table: 'despesas_publicas', select: 'id,titulo,entidade,montante_eur,data_publicacao' },
  comunicado: { table: 'comunicados', select: 'id,titulo,resumo,publicado_em' },
}
const ID_RE = /^[A-Za-z0-9._~-]{1,160}$/
const API_TTL = 600

async function supabaseConfig(env, request) {
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    return { url: env.SUPABASE_URL, key: env.SUPABASE_ANON_KEY }
  }
  // Escrito no build a partir de VITE_SUPABASE_URL/ANON_KEY (valores públicos, já estão no bundle).
  try {
    const r = await env.ASSETS.fetch(new URL('/seo-config.json', request.url))
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
      const c = await r.json()
      if (c.supabaseUrl && c.supabaseAnonKey) return { url: c.supabaseUrl, key: c.supabaseAnonKey }
    }
  } catch {
    /* sem config → meta genérica */
  }
  return null
}

async function fetchRow(env, request, kind, id) {
  const cfg = await supabaseConfig(env, request)
  const t = TABLE[kind]
  if (!cfg || !t || !ID_RE.test(id)) return null
  const api = `${cfg.url.replace(/\/$/, '')}/rest/v1/${t.table}?select=${t.select}&id=eq.${encodeURIComponent(id)}&limit=1`
  const cache = typeof caches !== 'undefined' ? caches.default : null
  const cacheKey = new Request(api)
  if (cache) {
    const hit = await cache.match(cacheKey)
    if (hit) return (await hit.json())[0] || null
  }
  const res = await fetch(api, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(2500),
  })
  if (!res.ok) return null
  const body = await res.text()
  if (cache) {
    await cache.put(cacheKey, new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${API_TTL}` } }))
  }
  return JSON.parse(body)[0] || null
}

export async function seoHandler(context, kind) {
  const { request, env, params } = context
  const url = new URL(request.url)
  const shell = await env.ASSETS.fetch(new URL('/', request.url))
  if (!shell.ok || !(shell.headers.get('content-type') || '').includes('text/html')) return shell
  const html = await shell.text()
  const id = String(Array.isArray(params.id) ? params.id[0] : params.id || '')

  let meta = null
  let source = 'fallback'
  try {
    const row = await fetchRow(env, request, kind, id)
    meta = recordMeta(kind, row, url.pathname)
    if (meta) source = 'db'
  } catch (e) {
    console.warn(`seo: ${kind} ${id}: ${e && e.message ? e.message : e}`)
    meta = null
  }
  if (!meta) meta = fallbackMeta(kind, url.pathname)

  const headers = new Headers(shell.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'no-cache, must-revalidate')
  headers.set('x-avoto-seo', source)
  headers.delete('content-length')
  headers.delete('etag')
  return new Response(applyMeta(html, meta, { siteUrl: env.SITE_URL || SITE_URL }), { status: 200, headers })
}
