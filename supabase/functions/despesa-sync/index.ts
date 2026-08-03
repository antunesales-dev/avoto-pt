/**
 * Sync de despesa pública / contratos (MVP).
 * Fontes oficiais previstas: Base.gov.pt, dados.gov.pt, DGO — nunca notícias.
 *
 * Auth: x-avoto-cron-secret + Authorization Bearer
 * POST body opcional: { despesas: [...], investimentos: [...] } para ops backfill
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const OFFICIAL = {
  base: 'https://www.base.gov.pt',
  dados: 'https://dados.gov.pt',
  dgo: 'https://www.dgo.gov.pt',
}

function authorized(req: Request): boolean {
  const cron = Deno.env.get('AVOTO_CRON_SECRET') || ''
  const headerSecret = req.headers.get('x-avoto-cron-secret') || ''
  if (cron && headerSecret && headerSecret === cron) return true
  const auth = req.headers.get('Authorization') || ''
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (service && auth === `Bearer ${service}`) return true
  return false
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

  const { data: run, error: runErr } = await admin
    .from('ar_sync_runs')
    .insert({
      status: 'running',
      source: 'despesa_publica',
      meta: { portals: OFFICIAL, mode: 'mvp' },
    })
    .select('id')
    .single()

  if (runErr) return jsonResponse({ error: runErr.message }, 500)

  let upserted = 0
  let skipped = 0
  let despesas: Record<string, unknown>[] = []
  let investimentos: Record<string, unknown>[] = []

  try {
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (Array.isArray(body?.despesas)) despesas = body.despesas
        if (Array.isArray(body?.investimentos)) investimentos = body.investimentos
      } catch {
        /* dry run */
      }
    }

    for (const d of despesas) {
      const { error } = await admin.rpc('upsert_despesa_publica', { p: d })
      if (error) skipped++
      else upserted++
    }
    for (const inv of investimentos) {
      const { error } = await admin.rpc('upsert_investimento', { p: inv })
      if (error) skipped++
      else upserted++
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
          mode: despesas.length || investimentos.length ? 'ops_payload' : 'dry_run',
          note:
            'Fetch automático Base/dados.gov a ligar no próximo incremento. Apenas fontes oficiais.',
        },
      })
      .eq('id', run.id)

    return jsonResponse({
      ok: true,
      run_id: run.id,
      upserted,
      skipped,
      portals: OFFICIAL,
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
    return jsonResponse({ ok: false, error: String(e) }, 500)
  }
})
