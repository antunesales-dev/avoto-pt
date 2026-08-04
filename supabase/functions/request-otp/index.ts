/**
 * Pedido de magic link / OTP com:
 * - Cloudflare Turnstile (anti-bot)
 * - rate limit por IP + device + email
 * - máx. 2 contas novas por device
 *
 * POST { email, device_id, turnstile_token?, redirect_to?, mode?: 'otp'|'check' }
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

async function verifyTurnstile(
  token: string,
  ip: string,
  secret: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!secret) {
    // secret não configurado → skip (dev local)
    return { ok: true }
  }
  if (!token || token.length < 10) {
    return { ok: false, error: 'TURNSTILE_REQUIRED' }
  }
  try {
    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', token)
    if (ip && ip !== 'unknown') body.set('remoteip', ip)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()
    if (!data?.success) {
      return { ok: false, error: 'TURNSTILE_FAILED' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'TURNSTILE_UNAVAILABLE' }
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)

    let body: {
      email?: string
      device_id?: string
      redirect_to?: string
      turnstile_token?: string
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
    const turnstileToken = String(body.turnstile_token || '').trim()

    if (!isEmail(email)) return jsonResponse({ error: 'EMAIL_INVALID' }, 400)
    if (deviceId.length < 8) return jsonResponse({ error: 'DEVICE_ID_REQUIRED' }, 400)

    const url = Deno.env.get('SUPABASE_URL') || ''
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!url || !service) {
      console.error('request-otp missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return jsonResponse(
        {
          error: 'SERVER_MISCONFIGURED',
          message: 'Serviço de login mal configurado. Tente mais tarde.',
        },
        500,
      )
    }

    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY') || ''
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const ip = clientIp(req)

    // 0) Turnstile (obrigatório se secret configurado)
    const captcha = await verifyTurnstile(turnstileToken, ip, turnstileSecret)
    if (!captcha.ok) {
      return jsonResponse(
        {
          error: captcha.error || 'TURNSTILE_FAILED',
          message:
            captcha.error === 'TURNSTILE_REQUIRED'
              ? 'Complete a verificação anti-bot (Turnstile) antes de continuar.'
              : 'Verificação anti-bot falhou. Actualize e tente de novo.',
        },
        403,
      )
    }

    // 1) Gate: só LÊ limites + se pode criar conta (não incrementa)
    const { data: gate, error: gateErr } = await admin.rpc('assert_auth_otp_allowed', {
      p_device_id: deviceId,
      p_ip: ip,
      p_email: email,
    })

    if (gateErr) {
      const msg = gateErr.message || String(gateErr)
      console.error('assert_auth_otp_allowed', msg)
      if (msg.includes('RATE_LIMITED')) {
        return jsonResponse(
          {
            error: 'RATE_LIMITED',
            message:
              'Demasiados pedidos de código. Espere 15–60 minutos e tente de novo (ou use palavra-passe se já tiver).',
          },
          429,
        )
      }
      if (/permission denied|does not exist|schema cache/i.test(msg)) {
        return jsonResponse(
          {
            error: 'GATE_UNAVAILABLE',
            message: 'Serviço de login temporariamente indisponível. Tente daqui a momentos.',
          },
          503,
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

    // 2) Enviar OTP (só depois do gate)
    const { error: otpErr } = await admin.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: allowCreate,
        emailRedirectTo: redirectTo,
      },
    })

    if (otpErr) {
      const msg = otpErr.message || String(otpErr)
      console.error('signInWithOtp', msg)
      // Email já existe mas shouldCreateUser false / signups off
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
      // Rate limit do próprio Supabase Auth (envio de email), não o nosso bucket
      if (/rate|too many|429|email rate|over_email/i.test(msg)) {
        return jsonResponse(
          {
            error: 'EMAIL_RATE_LIMITED',
            message:
              'O fornecedor de email limitou envios por agora. Espere alguns minutos (às vezes 1h no plano free) e tente de novo. Se já tiver palavra-passe, use “Entrar com palavra-passe”.',
          },
          429,
        )
      }
      return jsonResponse({ error: 'OTP_FAILED', message: msg }, 400)
    }

    // 3) Só conta no rate limit se o email foi aceite para envio
    try {
      await admin.rpc('record_auth_otp_sent', {
        p_device_id: deviceId,
        p_ip: ip,
        p_email: email,
      })
    } catch (e) {
      console.error('record_auth_otp_sent', e)
    }

    return jsonResponse({
      ok: true,
      email,
      allow_create: allowCreate,
      message: allowCreate
        ? 'Email enviado (login ou primeira conta neste dispositivo).'
        : 'Email enviado (só login — limite de contas neste dispositivo).',
    })
  } catch (e) {
    console.error('request-otp unhandled', e)
    return jsonResponse(
      {
        error: 'INTERNAL',
        message: 'Erro interno no serviço de login. Tente de novo.',
      },
      500,
    )
  }
})
