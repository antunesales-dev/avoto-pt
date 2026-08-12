/**
 * Gera digest de comunicados para uma data (portugal.gov.pt).
 * Separado de daily-digest (AR/despesa).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { authorized } from '../_shared/auth.ts'

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

  const { data, error } = await admin.rpc('generate_comunicados_digest', {
    p_date: dateStr,
  })
  if (error) return jsonResponse({ ok: false, error: error.message }, 500)

  const { data: digest } = await admin
    .from('comunicados_digests')
    .select('*')
    .eq('id', data)
    .maybeSingle()

  return jsonResponse({
    ok: true,
    digest_id: data,
    digest,
    note: 'Digest só de comunicados oficiais. Sem voto. Separado do Resumo do dia AR.',
  })
})
