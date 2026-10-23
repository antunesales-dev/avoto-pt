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
