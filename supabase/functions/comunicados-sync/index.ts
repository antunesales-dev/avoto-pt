/**
 * Sync comunicados / notícias oficiais (portugal.gov.pt) + digests por data.
 * Auth: x-avoto-cron-secret | Bearer service_role
 * Query: ?limit=60
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { authorized } from '../_shared/auth.ts'
import { fetchComunicados } from '../_shared/comunicados.ts'

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
  let limit = Number(urlObj.searchParams.get('limit') || '60')
  if (!Number.isFinite(limit) || limit < 1) limit = 60
  limit = Math.min(120, Math.floor(limit))

  const { data: run, error: runErr } = await admin
    .from('ar_sync_runs')
    .insert({
      status: 'running',
      source: 'comunicados_gov',
      meta: { portal: 'portugal.gov.pt', mode: 'sitemap' },
    })
    .select('id')
    .single()

  if (runErr) return jsonResponse({ error: runErr.message }, 500)

  let upserted = 0
  const digests: string[] = []

  try {
    const fetched = await fetchComunicados(limit)
    const items = fetched.items
    const candidates = fetched.candidates
    const errors = [...fetched.errors]
    const now = new Date().toISOString()

    if (items.length) {
      const rows = items.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        resumo: c.resumo,
        url_oficial: c.url_oficial,
        publicado_em: c.publicado_em,
        tipo: c.tipo,
        source: c.source,
        meta: c.meta,
        last_synced_at: now,
        updated_at: now,
      }))

      const { error: upErr } = await admin.from('comunicados').upsert(rows, { onConflict: 'id' })
      if (upErr) throw upErr
      upserted = rows.length
    }

    const dates = [...new Set(items.map((i) => i.publicado_em))].sort().reverse()
    // also regenerate today even if empty
    const today = now.slice(0, 10)
    if (!dates.includes(today)) dates.unshift(today)

    for (const d of dates.slice(0, 40)) {
      const { data: digId, error: digErr } = await admin.rpc('generate_comunicados_digest', {
        p_date: d,
      })
      if (digErr) {
        errors.push(`digest ${d}: ${digErr.message}`)
        continue
      }
      digests.push(String(digId))
    }

    await admin
      .from('ar_sync_runs')
      .update({
        status: 'ok',
        finished_at: now,
        upserted,
        skipped: 0,
        meta: {
          portal: 'portugal.gov.pt',
          mode: 'sitemap_html',
          candidates,
          n_items: items.length,
          digests: digests.length,
          sample_errors: errors.slice(0, 8),
        },
      })
      .eq('id', run.id)

    return jsonResponse({
      ok: true,
      upserted,
      candidates,
      digests: digests.length,
      errors: errors.slice(0, 10),
      run_id: run.id,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
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
