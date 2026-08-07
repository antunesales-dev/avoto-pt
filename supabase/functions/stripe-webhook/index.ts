/**
 * Stripe → ledger de doações (service_role).
 * Eventos: checkout.session.completed (Payment Link / Checkout).
 *
 * Secrets: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY (opcional se só verificamos assinatura),
 * SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Metadata opcional no Payment Link / session:
 *   display_tag = CID-XXXXXX | Anónimo
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Verificação simplificada do header Stripe-Signature (t=…,v1=…). */
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSec = 300,
): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, ...rest] = p.split('=')
      return [k.trim(), rest.join('=')]
    }),
  )
  const t = parts.t
  const v1 = parts.v1
  if (!t || !v1) return false
  const ts = Number(t)
  if (!Number.isFinite(ts)) return false
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > toleranceSec) return false
  const signed = `${t}.${payload}`
  const expected = await hmacSha256Hex(secret, signed)
  // comparação em tempo constante simples
  if (expected.length !== v1.length) return false
  let ok = 0
  for (let i = 0; i < expected.length; i++) ok |= expected.charCodeAt(i) ^ v1.charCodeAt(i)
  return ok === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const whSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
  if (!whSecret) {
    console.error('STRIPE_WEBHOOK_SECRET missing')
    return jsonResponse({ error: 'SERVER_MISCONFIGURED' }, 500)
  }

  const raw = await req.text()
  const sig = req.headers.get('stripe-signature') || ''
  if (!sig || !(await verifyStripeSignature(raw, sig, whSecret))) {
    return jsonResponse({ error: 'INVALID_SIGNATURE' }, 400)
  }

  let event: {
    id?: string
    type?: string
    data?: { object?: Record<string, unknown> }
  }
  try {
    event = JSON.parse(raw)
  } catch {
    return jsonResponse({ error: 'INVALID_JSON' }, 400)
  }

  if (event.type !== 'checkout.session.completed') {
    return jsonResponse({ ok: true, ignored: event.type })
  }

  const session = event.data?.object || {}
  const mode = String(session.mode || '')
  // payment ou subscription; doações = payment
  if (mode && mode !== 'payment') {
    return jsonResponse({ ok: true, ignored: 'mode_' + mode })
  }

  const amountTotal = session.amount_total
  const currency = String(session.currency || 'eur').toLowerCase()
  if (currency !== 'eur' || amountTotal == null) {
    return jsonResponse({ error: 'UNSUPPORTED_CURRENCY_OR_AMOUNT' }, 400)
  }
  const amountEur = Number(amountTotal) / 100
  if (!Number.isFinite(amountEur) || amountEur <= 0) {
    return jsonResponse({ error: 'BAD_AMOUNT' }, 400)
  }

  const meta = (session.metadata || {}) as Record<string, string>
  const clientRef = String(session.client_reference_id || '').trim()
  let displayTag =
    (meta.display_tag || meta.displayTag || '').trim() ||
    (/^CID-[A-Z0-9]+$/i.test(clientRef) ? clientRef.toUpperCase() : '') ||
    'Anónimo'
  if (displayTag.includes('@')) displayTag = 'Anónimo'
  displayTag = displayTag.slice(0, 40)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await admin.rpc('record_donation', {
    p: {
      amount_eur: String(amountEur),
      display_tag: displayTag,
      public_note: '',
      stripe_event_id: event.id || null,
      stripe_payment_id: session.payment_intent || null,
      stripe_checkout_session_id: session.id || null,
      donated_on: new Date().toISOString().slice(0, 10),
      meta: {
        payment_status: session.payment_status,
        customer_email_present: Boolean(session.customer_details || session.customer_email),
      },
    },
  })

  if (error) {
    console.error('record_donation', error.message)
    return jsonResponse({ error: error.message }, 500)
  }

  return jsonResponse({ ok: true, donation_id: data })
})
