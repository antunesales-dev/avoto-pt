#!/usr/bin/env node
/**
 * Pós-build: pré-render “leve” do <head> das rotas estáticas (sem SSR).
 *  - dist/<out>/index.html        → meta da home
 *  - dist/<out>/<rota>.html       → mesmo shell da SPA com <title>/description/og da rota
 *    (Cloudflare Pages e GitHub Pages servem /despesa a partir de despesa.html)
 *  - dist/<out>/_routes.json      → Pages Functions só nas fichas (/iniciativas/*, /despesa/*, /comunicados/*)
 *  - dist/<out>/seo-config.json   → URL + anon key públicos (já estão no bundle) para as Functions
 * Uso: node scripts/prerender-meta.mjs dist/pwa
 */
import fs from 'node:fs'
import path from 'node:path'
import { STATIC_ROUTES, applyMeta, staticMeta } from '../seo/meta.js'

const out = path.resolve(process.argv[2] || 'dist/pwa')
const indexFile = path.join(out, 'index.html')
if (!fs.existsSync(indexFile)) {
  console.error(`prerender-meta: ${indexFile} não existe (corre depois do quasar build)`)
  process.exit(1)
}
const shell = fs.readFileSync(indexFile, 'utf8')
const siteUrl = process.env.SITE_URL || 'https://avoto.pt'

let n = 0
for (const route of Object.keys(STATIC_ROUTES)) {
  const html = applyMeta(shell, staticMeta(route), { siteUrl })
  const file = route === '/' ? indexFile : path.join(out, `${route.slice(1)}.html`)
  fs.writeFileSync(file, html)
  n++
}

fs.writeFileSync(
  path.join(out, '_routes.json'),
  JSON.stringify({ version: 1, include: ['/iniciativas/*', '/despesa/*', '/comunicados/*'], exclude: [] }, null, 2),
)

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''
if (supabaseUrl && supabaseAnonKey) {
  fs.writeFileSync(path.join(out, 'seo-config.json'), JSON.stringify({ supabaseUrl, supabaseAnonKey }))
}
console.log(`prerender-meta: ${n} rotas com meta em ${path.relative(process.cwd(), out)}${supabaseUrl ? ' + seo-config.json' : ' (sem seo-config.json: Functions usam env SUPABASE_URL/SUPABASE_ANON_KEY)'}`)
