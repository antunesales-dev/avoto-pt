// node --test scripts/tests/
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseArgs, parsePair, sinceFrom } from '../link-comunicados.mjs'

test('parseArgs lê --chave=valor e flags', () => {
  assert.deepEqual(parseArgs(['--days=30', '--sample=0', '--x']), { days: '30', sample: '0', x: true })
})

test('sinceFrom: --since explícito ou hoje − dias', () => {
  assert.equal(sinceFrom({ since: '2026-08-01' }), '2026-08-01')
  assert.equal(sinceFrom({ days: '60' }, new Date('2026-10-23T12:00:00Z')), '2026-08-24')
  assert.equal(sinceFrom({}, new Date('2026-10-23T12:00:00Z')), '2026-08-24')
})

test('parsePair separa comunicado:iniciativa e rejeita lixo', () => {
  assert.deepEqual(parsePair('gov-abc:ar-xvii-p-69'), { comunicado_id: 'gov-abc', iniciativa_id: 'ar-xvii-p-69' })
  assert.throws(() => parsePair('semdoispontos'))
  assert.throws(() => parsePair('gov-abc:'))
})

import { chunk, proposeInBatches } from '../link-comunicados.mjs'

function fakeAdmin({ ids, rpc }) {
  const calls = []
  return {
    calls,
    from: () => {
      const q = { select: () => q, gte: () => q, order: () => q, range: async (a, b) => ({ data: ids.slice(a, b + 1).map((id) => ({ id })), error: null }) }
      return q
    },
    rpc: async (name, params) => {
      calls.push(params)
      return rpc(params)
    },
  }
}

test('chunk divide em lotes', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
  assert.deepEqual(chunk([], 3), [])
})

test('proposeInBatches: um lote por ≤N comunicados e soma os totais', async () => {
  const ids = Array.from({ length: 7 }, (_, i) => `c${i}`)
  const admin = fakeAdmin({ ids, rpc: async (p) => ({ data: [{ comunicados: p.p_ids.length, propostas: 2 * p.p_ids.length, novas: 1 }], error: null }) })
  const r = await proposeInBatches(admin, { p_since: '2026-08-24' }, 3)
  assert.deepEqual(admin.calls.map((c) => c.p_ids), [['c0', 'c1', 'c2'], ['c3', 'c4', 'c5'], ['c6']])
  assert.equal(admin.calls[0].p_since, '2026-08-24')
  assert.deepEqual([r.comunicados, r.propostas, r.novas, r.lotes], [7, 14, 3, 3])
})

test('proposeInBatches: lote com statement timeout é dividido ao meio', async () => {
  const ids = ['a', 'b', 'c', 'd']
  const admin = fakeAdmin({
    ids,
    rpc: async (p) =>
      p.p_ids.length > 2
        ? { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }
        : { data: [{ comunicados: p.p_ids.length, propostas: 0, novas: 0 }], error: null },
  })
  const r = await proposeInBatches(admin, { p_since: '2026-10-01' }, 4)
  assert.deepEqual(admin.calls.map((c) => c.p_ids), [['a', 'b', 'c', 'd'], ['a', 'b'], ['c', 'd']])
  assert.equal(r.comunicados, 4)
})

test('proposeInBatches: sem p_ids na BD (migração por aplicar) faz chamada única', async () => {
  const admin = fakeAdmin({
    ids: ['a'],
    rpc: async (p) =>
      p.p_ids ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } } : { data: [{ comunicados: 1, propostas: 1, novas: 0 }], error: null },
  })
  const r = await proposeInBatches(admin, { p_since: '2026-10-01' }, 25)
  assert.equal(admin.calls.length, 2)
  assert.equal(admin.calls[1].p_ids, undefined)
  assert.deepEqual([r.comunicados, r.lotes], [1, 0])
})

test('proposeInBatches: outros erros não são engolidos', async () => {
  const admin = fakeAdmin({ ids: ['a'], rpc: async () => ({ data: null, error: { code: '42501', message: 'FORBIDDEN' } }) })
  await assert.rejects(proposeInBatches(admin, { p_since: '2026-10-01' }, 25), (e) => e.code === '42501')
})
