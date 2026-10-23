// node --test seo/
import assert from 'node:assert/strict'
import test from 'node:test'
import { applyMeta, fallbackMeta, recordMeta, staticMeta, truncate } from './meta.js'

const SHELL =
  '<!doctype html><html lang=pt-PT><head><title>A Voto — Bancada Cidadã</title><meta charset=utf-8><meta name=description content="genérico"></head><body><div id=q-app></div></body></html>'

test('rota estática: title, description, canonical e og', () => {
  const html = applyMeta(SHELL, staticMeta('/contratos'))
  assert.match(html, /<title>Contratos ≥ 100 000 € · A Voto — Bancada Cidadã<\/title>/)
  assert.match(html, /<meta name="description" content="Os contratos públicos de 100 000 €/)
  assert.match(html, /<link rel="canonical" href="https:\/\/avoto.pt\/contratos">/)
  assert.match(html, /<meta property="og:type" content="website">/)
  assert.equal((html.match(/name="description"/g) || []).length, 1)
})

test('aplicar 2× não duplica tags', () => {
  const once = applyMeta(SHELL, staticMeta('/'))
  const twice = applyMeta(once, staticMeta('/despesa'))
  assert.equal((twice.match(/og:title/g) || []).length, 1)
  assert.equal((twice.match(/rel="canonical"/g) || []).length, 1)
  assert.equal((twice.match(/<noscript data-seo>/g) || []).length, 1)
  assert.match(twice, /href="https:\/\/avoto.pt\/despesa"/)
})

test('ficha de despesa: montante e entidade, com escape de HTML', () => {
  const m = recordMeta(
    'despesa',
    { titulo: 'Bisturis <b>& afins</b>', entidade: 'ULS "X"', montante_eur: '148288.86', data_publicacao: '2026-10-07' },
    '/despesa/base-abc',
  )
  const html = applyMeta(SHELL, m)
  assert.match(html, /<title>Bisturis &lt;b&gt;&amp; afins&lt;\/b&gt; — 148\s289 € · A Voto/)
  assert.match(html, /publicado a 07\/10\/2026 no Portal Base/)
  assert.match(html, /ULS &quot;X&quot;/)
  assert.match(html, /og:type" content="article"/)
})

test('ficha de iniciativa e fallback', () => {
  const m = recordMeta('iniciativa', { id_oficial: 'P 1 XVII', titulo: 'Lei da Nacionalidade', estado: 'aprovado', tema: 'Outros' }, '/iniciativas/ar-xvii-p-1')
  assert.equal(m.title, 'P 1 XVII — Lei da Nacionalidade · A Voto — Bancada Cidadã')
  assert.ok(!m.description.includes('Tema: Outros'))
  assert.equal(recordMeta('iniciativa', null, '/x'), null)
  assert.equal(fallbackMeta('comunicado', '/comunicados/x').title, 'Comunicados · A Voto — Bancada Cidadã')
})

test('truncate corta em palavra e acrescenta reticências', () => {
  assert.equal(truncate('um dois três quatro', 14), 'um dois três…')
  assert.equal(truncate('curto', 50), 'curto')
})
