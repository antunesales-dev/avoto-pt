#!/usr/bin/env node
/**
 * Integração do plano de conteúdo: iniciativas que o sync novo NÃO tocou (tema_fonte nulo —
 * p.ex. linhas que já não vêm no JSON da AR desse dia) ficam com o tema antigo da regex
 * (“iva” em “legislativa”, 36 % em “Outros”). Este script reclassifica-as só pelo título com a
 * taxonomia canónica (_shared/temas.js) e marca tema_fonte = 'palavras_chave_legado'.
 * O próximo sync completo da AR, com comissão, volta a sobrepor-se.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/reclassify-temas-legacy.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import { classifyTema } from '../supabase/functions/_shared/temas.js'

const dry = process.argv.includes('--dry-run')
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const admin = createClient(url, key)

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await admin
    .from('iniciativas')
    .select('id,titulo,tema')
    .is('tema_fonte', null)
    .range(from, from + 999)
  if (error) throw error
  rows.push(...data)
  if (data.length < 1000) break
}

const changes = []
for (const r of rows) {
  const { tema } = classifyTema({ comissao: null, titulo: r.titulo || '' })
  changes.push({ id: r.id, de: r.tema, para: tema })
}
const diff = changes.filter((c) => c.de !== c.para)
const outros = changes.filter((c) => c.para === 'Outros').length
console.log(`linhas sem tema_fonte: ${rows.length}; tema muda em ${diff.length}; ficam em Outros: ${outros}`)
if (dry) {
  for (const c of diff.slice(0, 15)) console.log(`  ${c.id}: ${c.de} → ${c.para}`)
  process.exit(0)
}
for (const c of changes) {
  const { error } = await admin
    .from('iniciativas')
    .update({ tema: c.para, tema_fonte: 'palavras_chave_legado' })
    .eq('id', c.id)
    .is('tema_fonte', null)
  if (error) throw error
}
console.log(`ok: ${changes.length} linhas atualizadas`)
