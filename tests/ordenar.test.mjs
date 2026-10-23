// Testes da ordenação de Despesa/Contratos. Correr: pnpm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ORDEM_DATA, ORDEM_VALOR, ordenarPorDataOuValor } from '../src/lib/ordenar.js'

const dataRef = (d) => d.data_publicacao || d.data_inicio || null
const ids = (rows) => rows.map((r) => r.id)

const rows = [
  { id: 'a', montante_eur: 500, data_publicacao: '2026-01-10' },
  { id: 'b', montante_eur: 9000, data_publicacao: '2025-06-01' },
  { id: 'c', montante_eur: null, data_publicacao: '2026-10-01' },
  { id: 'd', montante_eur: 1200, data_publicacao: null, data_inicio: '2026-03-05' },
  { id: 'e', montante_eur: '300000', data_publicacao: null },
]

test('por data: mais recente primeiro, sem data no fim', () => {
  assert.deepEqual(ids(ordenarPorDataOuValor(rows, ORDEM_DATA, dataRef)), ['c', 'd', 'a', 'b', 'e'])
})

test('por valor: maior primeiro, sem valor no fim, string numérica aceite', () => {
  assert.deepEqual(ids(ordenarPorDataOuValor(rows, ORDEM_VALOR, dataRef)), ['e', 'b', 'd', 'a', 'c'])
})

test('ordem desconhecida → por data (defeito)', () => {
  assert.deepEqual(
    ids(ordenarPorDataOuValor(rows, 'xpto', dataRef)),
    ids(ordenarPorDataOuValor(rows, ORDEM_DATA, dataRef)),
  )
})

test('empates: data igual → maior valor; valor igual → mais recente', () => {
  const r = [
    { id: 'x', montante_eur: 10, data_publicacao: '2026-05-01' },
    { id: 'y', montante_eur: 20, data_publicacao: '2026-05-01' },
    { id: 'z', montante_eur: 20, data_publicacao: '2026-06-01' },
  ]
  assert.deepEqual(ids(ordenarPorDataOuValor(r, ORDEM_DATA, dataRef)), ['z', 'y', 'x'])
  assert.deepEqual(ids(ordenarPorDataOuValor(r, ORDEM_VALOR, dataRef)), ['z', 'y', 'x'])
})

test('não altera o array original e tolera entrada vazia', () => {
  const copy = [...rows]
  ordenarPorDataOuValor(rows, ORDEM_VALOR, dataRef)
  assert.deepEqual(rows, copy)
  assert.deepEqual(ordenarPorDataOuValor(null, ORDEM_DATA, dataRef), [])
})
