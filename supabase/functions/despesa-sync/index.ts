/**
 * Sync despesa / contratos oficiais (Portal Base via SNS Transparência) + investimentos.
 * Auth: x-avoto-cron-secret | Bearer service_role
 *
 * Query: ?limit=80
 * POST body opcional: { despesas, investimentos } ops backfill
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { authorized } from '../_shared/auth.ts'
import { fetchBaseContratos } from '../_shared/despesa.ts'

const OFFICIAL = {
  base: 'https://www.base.gov.pt',
  dados: 'https://dados.gov.pt',
  sns: 'https://transparencia.sns.gov.pt/explore/dataset/portal-base/',
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
  let limit = Number(urlObj.searchParams.get('limit') || '200')
  if (!Number.isFinite(limit) || limit < 1) limit = 200
  limit = Math.min(500, Math.floor(limit))

  const { data: run, error: runErr } = await admin
    .from('ar_sync_runs')
    .insert({
      status: 'running',
      source: 'despesa_publica',
      meta: { portals: OFFICIAL, mode: 'fetch' },
    })
    .select('id')
    .single()

  if (runErr) return jsonResponse({ error: runErr.message }, 500)

  let upserted = 0
  let skipped = 0
  let mode = 'fetch'
  const errors: string[] = []

  try {
    let despesas: Record<string, unknown>[] = []
    let investimentos: Record<string, unknown>[] = []
    let fetchMeta: Record<string, unknown> = {}

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (Array.isArray(body?.despesas)) despesas = body.despesas
        if (Array.isArray(body?.investimentos)) investimentos = body.investimentos
        if (body?.limit) limit = Math.min(100, Number(body.limit) || limit)
        if (despesas.length || investimentos.length) mode = 'ops_payload'
      } catch {
        /* empty */
      }
    }

    if (!despesas.length && !investimentos.length) {
      const fetched = await fetchBaseContratos(limit)
      despesas = fetched.despesas
      investimentos = fetched.investimentos
      mode = 'base_via_sns'
      fetchMeta = {
        source: fetched.source,
        catalog_total: fetched.total,
        limit,
      }
    }

    for (const d of despesas) {
      const { error } = await admin.rpc('upsert_despesa_publica', { p: d })
      if (error) {
        skipped++
        if (errors.length < 10) errors.push(error.message)
      } else upserted++
    }
    for (const inv of investimentos) {
      const { error } = await admin.rpc('upsert_investimento', { p: inv })
      if (error) {
        skipped++
        if (errors.length < 10) errors.push(error.message)
      } else upserted++
    }

    await admin
      .from('ar_sync_runs')
      .update({
        status: 'ok',
        finished_at: new Date().toISOString(),
        upserted,
        skipped,
        meta: {
          portals: OFFICIAL,
          mode,
          ...fetchMeta,
          sample_errors: errors,
          n_despesas: despesas.length,
          n_investimentos: investimentos.length,
        },
      })
      .eq('id', run.id)

    return jsonResponse({
      ok: true,
      run_id: run.id,
      upserted,
      skipped,
      mode,
      portals: OFFICIAL,
      n_despesas: despesas.length,
      n_investimentos: investimentos.length,
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
      })
      .eq('id', run.id)
    return jsonResponse({ ok: false, error: String(e), run_id: run.id }, 500)
  }
})
