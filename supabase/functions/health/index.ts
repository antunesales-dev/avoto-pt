import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(url, anon)

    const { data, error } = await supabase.rpc('platform_health')
    if (error) {
      return jsonResponse({ ok: false, error: error.message }, 500)
    }

    return jsonResponse({
      ok: true,
      service: 'avoto-edge-health',
      at: new Date().toISOString(),
      platform: data,
    })
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500)
  }
})
