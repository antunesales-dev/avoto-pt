/**
 * Cron diário A Voto: ar-sync → despesa-sync → daily-digest
 * Deploy: cd workers/daily-cron && wrangler deploy
 * Secrets: AVOTO_CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

async function callFn(base, name, secret, serviceKey, pathQuery = '') {
  const url = `${base.replace(/\/$/, '')}/functions/v1/${name}${pathQuery}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'x-avoto-cron-secret': secret,
    },
    body: '{}',
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text.slice(0, 500) }
  }
  return { name, status: res.status, ok: res.ok, body: json }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runPipeline(env))
  },

  async fetch(req, env) {
    const url = new URL(req.url)
    if (url.pathname === '/run') {
      // manual trigger (proteger com secret)
      const secret = req.headers.get('x-avoto-cron-secret') || ''
      if (!env.AVOTO_CRON_SECRET || secret !== env.AVOTO_CRON_SECRET) {
        return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 })
      }
      const result = await runPipeline(env)
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('avoto-daily-cron ok', { status: 200 })
  },
}

async function runPipeline(env) {
  const base = env.SUPABASE_URL
  const secret = env.AVOTO_CRON_SECRET
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_OR_SERVICE_KEY
  if (!base || !secret || !key) {
    return { ok: false, error: 'Missing env: SUPABASE_URL / AVOTO_CRON_SECRET / SERVICE_ROLE' }
  }

  const steps = []
  steps.push(await callFn(base, 'ar-sync', secret, key, '?limit=200'))
  steps.push(await callFn(base, 'despesa-sync', secret, key, '?limit=80'))
  steps.push(await callFn(base, 'daily-digest', secret, key))

  return {
    ok: steps.every((s) => s.ok),
    at: new Date().toISOString(),
    steps,
  }
}
