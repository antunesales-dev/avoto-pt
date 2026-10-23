// deno test supabase/functions/tests/  — chave do índice de pesquisa via header (só chamadores autorizados)
import { assertEquals } from 'jsr:@std/assert@1'
import { authorized, govSearchKey } from '../_shared/auth.ts'

const SERVICE = 'service-role-test'
const CRON = 'cron-test'

function withEnv(fn: () => void) {
  const prev = {
    s: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    c: Deno.env.get('AVOTO_CRON_SECRET'),
  }
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SERVICE)
  Deno.env.set('AVOTO_CRON_SECRET', CRON)
  try {
    fn()
  } finally {
    if (prev.s === undefined) Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY')
    else Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', prev.s)
    if (prev.c === undefined) Deno.env.delete('AVOTO_CRON_SECRET')
    else Deno.env.set('AVOTO_CRON_SECRET', prev.c)
  }
}

const req = (h: Record<string, string>) => new Request('http://x/comunicados-sync', { method: 'POST', headers: h })

Deno.test('govSearchKey: header aceite com service_role', () =>
  withEnv(() => {
    const r = req({ Authorization: `Bearer ${SERVICE}`, 'x-gov-search-key': ' 01-header ' })
    assertEquals(authorized(r), true)
    assertEquals(govSearchKey(r, '01-env'), '01-header')
  }))

Deno.test('govSearchKey: header aceite com cron secret', () =>
  withEnv(() => {
    const r = req({ 'x-avoto-cron-secret': CRON, 'x-gov-search-key': '01-header' })
    assertEquals(govSearchKey(r, ''), '01-header')
  }))

Deno.test('govSearchKey: header ignorado sem autorização (anon)', () =>
  withEnv(() => {
    const r = req({ Authorization: 'Bearer anon-key', 'x-gov-search-key': '01-evil' })
    assertEquals(authorized(r), false)
    assertEquals(govSearchKey(r, '01-env'), '01-env')
    assertEquals(govSearchKey(r, ''), '')
  }))

Deno.test('govSearchKey: sem header usa o env', () =>
  withEnv(() => {
    const r = req({ Authorization: `Bearer ${SERVICE}`, 'x-gov-search-key': '   ' })
    assertEquals(govSearchKey(r, '01-env'), '01-env')
  }))
