/**
 * Sync Dados Abertos AR → iniciativas (upsert).
 * Auth: x-avoto-cron-secret | Bearer service_role
 *
 * O JSON oficial (~80 MB) ultrapassa a memória da edge free.
 * Em produção use: `node scripts/sync-ar.mjs` ou o workflow sync-daily.yml.
 *
 * Esta function:
 * - aceita POST { iniciativas: [...] } (ops / script)
 * - tenta fetch directo só com ?limit=≤40 (pode falhar por RESOURCE_LIMIT)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { authorized } from '../_shared/auth.ts'
import { fetchArIniciativas, type MappedIniciativa } from '../_shared/ar.ts'

const OFFICIAL_PORTAL =
  'https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx'

async function upsertBatch(
  admin: ReturnType<typeof createClient>,
  items: MappedIniciativa[],
): Promise<{ upserted: number; skipped: number; errors: string[] }> {
  let upserted = 0
  let skipped = 0
  const errors: string[] = []
  const chunk = 15
  for (let i = 0; i < items.length; i += chunk) {
    const slice = items.slice(i, i + chunk)
    const results = await Promise.all(
      slice.map(async (raw) => {
        const { error } = await admin.rpc('upsert_iniciativa_from_ar', { p: raw })
        if (error) return { ok: false as const, msg: error.message }
        return { ok: true as const }
      }),
    )
    for (const r of results) {
      if (r.ok) upserted++
      else {
        skipped++
        if (errors.length < 12) errors.push(r.msg)
      }
    }
  }
  return { upserted, skipped, errors }
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
  let limit = Number(urlObj.searchParams.get('limit') || '40')
  if (!Number.isFinite(limit) || limit < 1) limit = 40
  // edge free: manter baixo; full sync via scripts/sync-ar.mjs
  limit = Math.min(80, Math.floor(limit))

  const { data: run, error: runErr } = await admin
    .from('ar_sync_runs')
    .insert({
      status: 'running',
      source: 'parlamento.pt',
      meta: { portal: OFFICIAL_PORTAL, mode: 'fetch' },
    })
    .select('id')
    .single()

  if (runErr) return jsonResponse({ error: runErr.message }, 500)

  let upserted = 0
  let skipped = 0
  let mode = 'fetch'
  let meta: Record<string, unknown> = { portal: OFFICIAL_PORTAL }

  try {
    let items: MappedIniciativa[] = []

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (Array.isArray(body?.iniciativas) && body.iniciativas.length) {
          items = body.iniciativas
          mode = 'ops_payload'
        }
        if (body?.limit) limit = Math.min(500, Number(body.limit) || limit)
      } catch {
        /* no body */
      }
    }

    if (!items.length) {
      const fetched = await fetchArIniciativas(limit)
      items = fetched.items
      meta = {
        portal: OFFICIAL_PORTAL,
        source_label: fetched.sourceLabel,
        source_url_base: fetched.sourceUrl,
        raw_count: fetched.rawCount,
        limit,
        mode: 'ar_open_data_fetch',
      }
      mode = 'ar_open_data_fetch'
    }

    const result = await upsertBatch(admin, items)
    upserted = result.upserted
    skipped = result.skipped
    meta = { ...meta, mode, sample_errors: result.errors }

    await admin
      .from('ar_sync_runs')
      .update({
        status: 'ok',
        finished_at: new Date().toISOString(),
        upserted,
        skipped,
        meta,
      })
      .eq('id', run.id)

    return jsonResponse({
      ok: true,
      run_id: run.id,
      upserted,
      skipped,
      mode,
      limit,
      portal: OFFICIAL_PORTAL,
      meta,
    })
  } catch (e) {
    await admin
      .from('ar_sync_runs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: String(e),
        upserted,
        skipped,
        meta,
      })
      .eq('id', run.id)

    return jsonResponse({ ok: false, error: String(e), run_id: run.id }, 500)
  }
})
