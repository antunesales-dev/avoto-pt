/**
 * Apagar a própria conta (RGPD — direito ao apagamento).
 * POST com Authorization: Bearer <access_token do utilizador>
 * Usa service_role só para admin.deleteUser; valida o JWT do caller.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'UNAUTHORIZED', message: 'Sessão em falta.' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: 'SERVER_MISCONFIGURED' }, 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user?.id) {
    return jsonResponse({ error: 'UNAUTHORIZED', message: 'Sessão inválida ou expirada.' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Cascata: profiles ON DELETE CASCADE → votos, device_accounts, prefs, etc.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    console.error('deleteUser', delErr)
    return jsonResponse(
      { error: 'DELETE_FAILED', message: delErr.message || 'Não foi possível apagar a conta.' },
      500,
    )
  }

  return jsonResponse({ ok: true, deleted: user.id })
})
