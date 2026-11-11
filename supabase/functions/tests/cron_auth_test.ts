// deno test supabase/functions/tests/ — despesa-sync exige x-avoto-cron-secret (falha fechado)
import { assertEquals } from 'jsr:@std/assert@1'
import { cronSecretOk } from '../_shared/auth.ts'

const CRON = 'cron-test-value'
const SERVICE = 'service-role-test'
const req = (h: Record<string, string>) => new Request('http://x/despesa-sync', { method: 'POST', headers: h })

async function withEnv(cron: string | undefined, fn: () => Promise<void>) {
  const prev = { c: Deno.env.get('AVOTO_CRON_SECRET'), s: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') }
  if (cron === undefined) Deno.env.delete('AVOTO_CRON_SECRET')
  else Deno.env.set('AVOTO_CRON_SECRET', cron)
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SERVICE)
  try {
    await fn()
  } finally {
    if (prev.c === undefined) Deno.env.delete('AVOTO_CRON_SECRET')
    else Deno.env.set('AVOTO_CRON_SECRET', prev.c)
    if (prev.s === undefined) Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY')
    else Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', prev.s)
  }
}

Deno.test('cronSecretOk: header certo → true', () =>
  withEnv(CRON, async () => assertEquals(await cronSecretOk(req({ 'x-avoto-cron-secret': CRON })), true)))

Deno.test('cronSecretOk: header errado → false', () =>
  withEnv(CRON, async () => assertEquals(await cronSecretOk(req({ 'x-avoto-cron-secret': CRON + 'x' })), false)))

Deno.test('cronSecretOk: sem header → false (service_role não chega)', () =>
  withEnv(CRON, async () => assertEquals(await cronSecretOk(req({ Authorization: `Bearer ${SERVICE}` })), false)))

Deno.test('cronSecretOk: secret em falta no servidor → false', () =>
  withEnv(undefined, async () => {
    assertEquals(await cronSecretOk(req({ 'x-avoto-cron-secret': '' })), false)
    assertEquals(await cronSecretOk(req({ 'x-avoto-cron-secret': 'qualquer' })), false)
  }))

Deno.test('cronSecretOk: secret vazio no servidor → false', () =>
  withEnv('', async () => assertEquals(await cronSecretOk(req({ 'x-avoto-cron-secret': '' })), false)))
