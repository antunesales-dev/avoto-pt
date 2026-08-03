/**
 * Gera digest diário a partir de iniciativas na BD (dados oficiais quando sync AR estiver activo).
 * Auth: x-avoto-cron-secret + Authorization Bearer (gateway)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

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
  if (!authorized(req)) return jsonResponse({ error: 'UNAUTHORIZED' }, 401)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let dateStr = new Date().toISOString().slice(0, 10)
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      if (body?.date) dateStr = String(body.date).slice(0, 10)
    } catch {
      /* empty */
    }
  }

  const { data, error } = await admin.rpc('generate_daily_digest', {
    p_date: dateStr,
  })

  if (error) return jsonResponse({ ok: false, error: error.message }, 500)

  const { data: digest } = await admin
    .from('daily_digests')
    .select('*')
    .eq('id', data)
    .maybeSingle()

  return jsonResponse({
    ok: true,
    digest_id: data,
    digest,
    note:
      'Digest factual completo (título, estado, partidos, cidadãos, links). Sem AI. Conteúdo AR real depende do ar-sync oficial.',
  })
})
