/**
 * Sync comunicados / notícias oficiais (portugal.gov.pt) + digests por data.
 * Auth: x-avoto-cron-secret | Bearer service_role
 * Query:
 *   ?limit=60        comunicados do CM via sitemap (máx. 120)
 *   ?days=3          janela de notícias (índice de pesquisa do portal); backfill: ?days=60
 *   ?news_max=300    máximo de notícias por execução
 *   ?delay_ms=1000   pausa entre pedidos ao portal (mín. 500)
 *   ?news_only=1     salta o sitemap (útil em backfill)
 * Header opcional: x-gov-search-key (só de chamadores autorizados; tem prioridade sobre o env).
 * Env: GOV_SEARCH_KEY (chave pública do índice do portal; sem ela as notícias ficam desligadas),
 *      GOV_SEARCH_ENDPOINT (opcional).
 * Nomeações: não são importadas. Digests: só para dias com entradas (nunca vazios).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { authorized, govSearchKey } from '../_shared/auth.ts'
import { discoverNoticias, fetchComunicados, type MappedComunicado } from '../_shared/comunicados.ts'

function intParam(u: URL, name: string, def: number, min: number, max: number): number {
  const n = Number(u.searchParams.get(name) ?? def)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, Math.floor(n)))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
  }
  if (!authorized(req)) return jsonResponse({ error: 'UNAUTHORIZED' }, 401)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const urlObj = new URL(req.url)
  const limit = intParam(urlObj, 'limit', 60, 1, 120)
  const days = intParam(urlObj, 'days', 3, 1, 400)
  const newsMax = intParam(urlObj, 'news_max', 300, 1, 2000)
  const delayMs = intParam(urlObj, 'delay_ms', 1000, 500, 10000)
  const newsOnly = urlObj.searchParams.get('news_only') === '1'
  const searchKey = govSearchKey(req)
  const searchEndpoint = Deno.env.get('GOV_SEARCH_ENDPOINT') || undefined

  const { data: run, error: runErr } = await admin
    .from('ar_sync_runs')
    .insert({
      status: 'running',
      source: 'comunicados_gov',
      meta: { portal: 'portugal.gov.pt', mode: 'sitemap+search_index', days },
    })
    .select('id')
    .single()

  if (runErr) return jsonResponse({ error: runErr.message }, 500)

  let upserted = 0
  const digests: string[] = []

  try {
    const errors: string[] = []
    let candidates = 0
    let cm: MappedComunicado[] = []
    if (!newsOnly) {
      const fetched = await fetchComunicados(limit, delayMs)
      cm = fetched.items
      candidates = fetched.candidates
      errors.push(...fetched.errors)
    }

    let news: MappedComunicado[] = []
    let newsTotal: number | null = null
    let newsRequests = 0
    if (searchKey) {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
      const d = await discoverNoticias({
        searchKey,
        endpoint: searchEndpoint,
        since,
        maxItems: newsMax,
        delayMs,
      })
      news = d.items
      newsTotal = d.total
      newsRequests = d.requests
      errors.push(...d.errors)
    } else {
      errors.push('noticias: GOV_SEARCH_KEY não definido — descoberta de notícias desligada')
    }

    const byId = new Map<string, MappedComunicado>()
    for (const c of [...cm, ...news]) if (c.tipo !== 'nomeacao') byId.set(c.id, c)
    const items = [...byId.values()]
    const now = new Date().toISOString()

    if (items.length) {
      const rows = items.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        resumo: c.resumo,
        corpo: c.corpo || '',
        url_oficial: c.url_oficial,
        publicado_em: c.publicado_em,
        tipo: c.tipo,
        source: c.source,
        tags: c.tags,
        areas: c.areas,
        officials: c.officials,
        roles: c.roles,
        tema: c.tema,
        meta: c.meta,
        last_synced_at: now,
        updated_at: now,
      }))
      for (let i = 0; i < rows.length; i += 200) {
        const { error: upErr } = await admin
          .from('comunicados')
          .upsert(rows.slice(i, i + 200), { onConflict: 'id' })
        if (upErr) throw upErr
      }
      upserted = rows.length
    }

    // Digests só para os dias que têm entradas (a RPC apaga/ignora dias vazios)
    const dates = [...new Set(items.map((i) => i.publicado_em))].sort().reverse()
    for (const d of dates.slice(0, 120)) {
      const { data: digId, error: digErr } = await admin.rpc('generate_comunicados_digest', {
        p_date: d,
      })
      if (digErr) {
        errors.push(`digest ${d}: ${digErr.message}`)
        continue
      }
      if (digId) digests.push(String(digId))
    }

    const finished = new Date().toISOString()
    const meta = {
      portal: 'portugal.gov.pt',
      mode: 'sitemap+search_index',
      candidates,
      n_cm: cm.length,
      n_noticias: news.length,
      noticias_total_indice: newsTotal,
      noticias_pedidos: newsRequests,
      days,
      digests: digests.length,
      sample_errors: errors.slice(0, 8),
    }
    await admin
      .from('ar_sync_runs')
      .update({ status: 'ok', finished_at: finished, upserted, skipped: 0, meta })
      .eq('id', run.id)

    return jsonResponse({ ok: true, upserted, ...meta, errors: errors.slice(0, 10), run_id: run.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message || String(e)
    await admin
      .from('ar_sync_runs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: msg.slice(0, 500),
        upserted,
      })
      .eq('id', run.id)
    return jsonResponse({ ok: false, error: msg, run_id: run.id }, 500)
  }
})
