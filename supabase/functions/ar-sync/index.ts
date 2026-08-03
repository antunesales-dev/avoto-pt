/**
 * Sincronização Dados Abertos da AR (MVP).
 *
 * Autenticação: header `x-avoto-cron-secret` = env AVOTO_CRON_SECRET
 *              ou Authorization Bearer service_role
 *
 * Fase actual: regista run + upsert de amostra estruturada (placeholder).
 * Próximo: fetch real JSON/XML oficiais parlamento.pt e mapeamento completo.
 *
 * Nunca usa fontes de notícias/wikis — só URLs oficiais.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const OFFICIAL_PORTAL =
  'https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx'

function authorized(req: Request): boolean {
  const cron = Deno.env.get('AVOTO_CRON_SECRET') || ''
  const headerSecret = req.headers.get('x-avoto-cron-secret') || ''
  // Gateway exige Authorization; a autorização real é o cron secret ou service_role
  if (cron && headerSecret && headerSecret === cron) return true

  const auth = req.headers.get('Authorization') || ''
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (service && auth === `Bearer ${service}`) return true

  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  if (!authorized(req)) {
    return jsonResponse({ error: 'UNAUTHORIZED' }, 401)
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, service)

  const { data: run, error: runErr } = await admin
    .from('ar_sync_runs')
    .insert({
      status: 'running',
      source: 'parlamento.pt',
      meta: { portal: OFFICIAL_PORTAL, mode: 'mvp_placeholder' },
    })
    .select('id')
    .single()

  if (runErr) {
    return jsonResponse({ error: runErr.message }, 500)
  }

  const runId = run.id
  let upserted = 0
  let skipped = 0

  try {
    // MVP: não inventa dados de notícias. Placeholder vazio até mapeamento AR.
    // Opcional: body JSON com array `iniciativas` para backfill controlado (ops).
    let items: Record<string, unknown>[] = []
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (Array.isArray(body?.iniciativas)) {
          items = body.iniciativas
        }
      } catch {
        // GET ou body vazio = dry run estrutural
      }
    }

    for (const raw of items) {
      const { data, error } = await admin.rpc('upsert_iniciativa_from_ar', {
        p: raw,
      })
      if (error) {
        skipped += 1
        console.error('upsert failed', error.message)
      } else {
        upserted += 1
        console.log('upserted', data)
      }
    }

    await admin
      .from('ar_sync_runs')
      .update({
        status: 'ok',
        finished_at: new Date().toISOString(),
        upserted,
        skipped,
        meta: {
          portal: OFFICIAL_PORTAL,
          mode: items.length ? 'ops_payload' : 'dry_run',
          note:
            items.length === 0
              ? 'Sem payload: run registado. Ligar fetch oficial no próximo incremento.'
              : 'Upsert a partir de payload ops (não seed público).',
        },
      })
      .eq('id', runId)

    return jsonResponse({
      ok: true,
      run_id: runId,
      upserted,
      skipped,
      portal: OFFICIAL_PORTAL,
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
      .eq('id', runId)

    return jsonResponse({ ok: false, error: String(e), run_id: runId }, 500)
  }
})
