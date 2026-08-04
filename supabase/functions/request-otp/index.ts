/**
 * Pedido de magic link / OTP com rate limit por IP + device.
 * O cliente NÃO deve chamar signInWithOtp directamente para criar contas.
 *
 * POST { email, device_id, redirect_to? }
 * Auth: anon (pública) — a protecção é o rate limit interno.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  )
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)

  let body: {
    email?: string
    device_id?: string
    redirect_to?: string
    /** 'otp' (default) | 'check' — check não envia email (ex.: registo com password) */
    mode?: string
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'INVALID_JSON' }, 400)
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  const deviceId = String(body.device_id || '').trim()
  const redirectTo = body.redirect_to ? String(body.redirect_to) : undefined
  const mode = body.mode === 'check' ? 'check' : 'otp'

  if (!isEmail(email)) return jsonResponse({ error: 'EMAIL_INVALID' }, 400)
  if (deviceId.length < 8) return jsonResponse({ error: 'DEVICE_ID_REQUIRED' }, 400)

  const url = Deno.env.get('SUPABASE_URL')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, service)

  const ip = clientIp(req)

  // 1) Rate limit + política de criação
  const { data: gate, error: gateErr } = await admin.rpc('assert_auth_otp_allowed', {
    p_device_id: deviceId,
    p_ip: ip,
    p_email: email,
  })

  if (gateErr) {
    const msg = gateErr.message || String(gateErr)
    if (msg.includes('RATE_LIMITED')) {
      return jsonResponse(
        {
          error: 'RATE_LIMITED',
          message:
            'Demasiados pedidos deste dispositivo ou rede. Espere cerca de uma hora e tente de novo.',
        },
        429,
      )
    }
    return jsonResponse({ error: 'GATE_FAILED', message: msg }, 400)
  }

  const allowCreate = gate?.allow_create !== false

  if (mode === 'check') {
    if (!allowCreate) {
      return jsonResponse(
        {
          error: 'DEVICE_ACCOUNT_LIMIT',
          message:
            'Limite de contas neste dispositivo. Use uma conta já existente ou outro dispositivo.',
          allow_create: false,
          device_accounts: gate?.device_accounts ?? null,
        },
        403,
      )
    }
    return jsonResponse({
      ok: true,
      allow_create: true,
      device_accounts: gate?.device_accounts ?? 0,
      mode: 'check',
    })
  }

  // 2) Enviar OTP (service role no servidor)
  const { error: otpErr } = await admin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: allowCreate,
      emailRedirectTo: redirectTo,
    },
  })

  if (otpErr) {
    const msg = otpErr.message || String(otpErr)
    // email não existe e criação bloqueada
    if (!allowCreate || /signups not allowed|user not found|unable to validate/i.test(msg)) {
      return jsonResponse(
        {
          error: 'DEVICE_ACCOUNT_LIMIT',
          message:
            'Limite de contas neste dispositivo. Use uma conta já existente ou outro dispositivo.',
          allow_create: false,
        },
        403,
      )
    }
    // rate limit nativo Supabase Auth
    if (/rate|too many|429/i.test(msg)) {
      return jsonResponse(
        {
          error: 'RATE_LIMITED',
          message: 'Demasiados emails. Espere e tente de novo.',
        },
        429,
      )
    }
    return jsonResponse({ error: 'OTP_FAILED', message: msg }, 400)
  }

  return jsonResponse({
    ok: true,
    email,
    allow_create: allowCreate,
    message: allowCreate
      ? 'Email enviado (login ou primeira conta neste dispositivo).'
      : 'Email enviado (só login — limite de contas neste dispositivo).',
  })
})
