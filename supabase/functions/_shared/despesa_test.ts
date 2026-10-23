// deno test supabase/functions/_shared/despesa_test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  despesaPayloadError,
  investimentoPayloadError,
  isStableDespesaId,
} from './despesa.ts'

Deno.test('ids antigos (slug) são recusados para base.gov.pt', () => {
  const legacy = 'base-510103448-2026-04-27-325630-25-0402-0971-2026-material-de-encavilhamen'
  assertEquals(isStableDespesaId(legacy), false)
  assertEquals(despesaPayloadError({ id: legacy, source: 'base.gov.pt' })?.startsWith('LEGACY_DESPESA_ID'), true)
})

Deno.test('id hash é aceite', () => {
  const id = 'base-00458af960c4606b103f74dbd775'
  assertEquals(isStableDespesaId(id), true)
  assertEquals(despesaPayloadError({ id, source: 'base.gov.pt' }), null)
})

Deno.test('outras fontes não são afetadas', () => {
  assertEquals(despesaPayloadError({ id: 'orc-2026-linha-1', source: 'dgo' }), null)
})

Deno.test('investimento tem de ser inv-<despesa_id hash>', () => {
  const d = 'base-00458af960c4606b103f74dbd775'
  assertEquals(investimentoPayloadError({ id: `inv-${d}`, despesa_id: d, source: 'base.gov.pt' }), null)
  assertEquals(
    investimentoPayloadError({ id: 'inv-base-510103448-x', despesa_id: 'base-510103448-x', source: 'base.gov.pt' }) !== null,
    true,
  )
})
