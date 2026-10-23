/**
 * Dados Abertos AR — descoberta + mapeamento (sem fontes não oficiais).
 * Portal: https://www.parlamento.pt/Cidadania/Paginas/DAIniciativas.aspx
 */

// Mapper único (Node + Deno): ver ar-mapper.js. Aqui fica só a descoberta/download para a edge.
import { DA_INICIATIVAS, mapArIniciativa as mapShared } from './ar-mapper.js'

const UA = 'A-Voto/1.0 (+https://avoto.pt; civic open data; contact via GitHub)'

export type MappedIniciativa = Record<string, unknown>

/** raw da AR → payload de `upsert_iniciativa_from_ar` (inclui tema pela comissão competente). */
export function mapArIniciativa(raw: Record<string, unknown>): MappedIniciativa | null {
  return mapShared(raw) as MappedIniciativa | null
}

/** Descobre URL assinada do JSON da legislatura actual (XVII preferida). */
export async function discoverArIniciativasJsonUrl(): Promise<{ url: string; label: string }> {
  const override = Deno.env.get('AR_INICIATIVAS_URL')
  if (override) return { url: override, label: 'env:AR_INICIATIVAS_URL' }

  const page = await fetch(DA_INICIATIVAS, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  })
  if (!page.ok) throw new Error(`DAIniciativas HTTP ${page.status}`)
  const html0 = await page.text()

  // Prefer XVII, then XVI, then first Path link
  const legLink =
    html0.match(/href="(\/Cidadania\/Paginas\/DAIniciativas\.aspx\?t=57465a4a[^"]+)"/i) ||
    html0.match(/href="(\/Cidadania\/Paginas\/DAIniciativas\.aspx\?t=57465a4a4945[^"]+)"/i) ||
    html0.match(/href="(\/Cidadania\/Paginas\/DAIniciativas\.aspx\?t=[^"]+Path=[^"]+)"/i)

  if (!legLink) throw new Error('Não encontrei link de legislatura em DAIniciativas')

  const legUrl = 'https://www.parlamento.pt' + legLink[1].replace(/&amp;/g, '&')
  const legPage = await fetch(legUrl, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html',
      Referer: DA_INICIATIVAS,
    },
  })
  if (!legPage.ok) throw new Error(`Legislatura page HTTP ${legPage.status}`)
  const html = await legPage.text()

  const jsonLink =
    html.match(
      /href="(https:\/\/app\.parlamento\.pt\/webutils\/docs\/doc\.txt\?[^"]*Iniciativas[A-Z0-9]*_json\.txt[^"]*)"/i,
    ) ||
    html.match(
      /href="(https:\/\/app\.parlamento\.pt\/webutils\/docs\/doc\.txt\?path=[^"]+)"/i,
    )

  if (!jsonLink) throw new Error('Não encontrei ficheiro JSON de iniciativas no portal AR')

  return {
    url: jsonLink[1].replace(/&amp;/g, '&'),
    label: 'parlamento.pt Dados Abertos',
  }
}

/**
 * Stream-parse de um array JSON top-level sem carregar o ficheiro inteiro na RAM
 * (o JSON da AR XVII tem ~80 MB — rebenta o limite da edge se fizer res.json()).
 */
async function* streamJsonArrayObjects(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let depth = 0
  let inString = false
  let escape = false
  let objStart = -1
  let arrayStarted = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })

    let i = 0
    while (i < buf.length) {
      const ch = buf[i]

      if (!arrayStarted) {
        if (ch === '[') arrayStarted = true
        i++
        continue
      }

      if (objStart < 0) {
        if (ch === '{') {
          objStart = i
          depth = 1
          inString = false
          escape = false
        }
        i++
        continue
      }

      // dentro de objecto
      if (inString) {
        if (escape) escape = false
        else if (ch === '\\') escape = true
        else if (ch === '"') inString = false
        i++
        continue
      }

      if (ch === '"') {
        inString = true
        i++
        continue
      }
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const slice = buf.slice(objStart, i + 1)
          objStart = -1
          try {
            yield JSON.parse(slice) as Record<string, unknown>
          } catch {
            /* objecto malformado — ignora */
          }
          // descarta prefixo processado
          buf = buf.slice(i + 1)
          i = 0
          continue
        }
      }
      i++
    }

    // manter só a partir do objecto em curso
    if (objStart > 0) {
      buf = buf.slice(objStart)
      objStart = 0
    } else if (objStart < 0 && buf.length > 64) {
      // só whitespace/vírgulas entre objectos
      buf = buf.slice(-8)
    }
  }
}

export async function fetchArIniciativas(limit = 250): Promise<{
  items: MappedIniciativa[]
  sourceUrl: string
  sourceLabel: string
  rawCount: number
}> {
  const { url, label } = await discoverArIniciativasJsonUrl()
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json,text/plain,*/*',
      Referer: DA_INICIATIVAS,
    },
  })
  if (!res.ok) throw new Error(`Download AR JSON HTTP ${res.status}`)
  if (!res.body) throw new Error('AR JSON sem body stream')

  const mapped: MappedIniciativa[] = []
  let rawCount = 0
  for await (const row of streamJsonArrayObjects(res.body)) {
    rawCount++
    const m = mapArIniciativa(row)
    if (!m) continue
    // Os dossiês só podem ser calculados com o ficheiro completo (scripts/sync-ar.mjs).
    // Sem a chave, o upsert mantém o dossie_id que já existe na BD.
    delete m.dossie_id
    mapped.push(m)
  }

  mapped.sort((a, b) => {
    const hasA = a.data_votacao ? 1 : 0
    const hasB = b.data_votacao ? 1 : 0
    if (hasB !== hasA) return hasB - hasA
    const da = String(a.data_votacao || a.data_entrada || '')
    const db = String(b.data_votacao || b.data_entrada || '')
    return db.localeCompare(da)
  })

  return {
    items: mapped.slice(0, Math.max(1, limit)),
    sourceUrl: url.split('?')[0],
    sourceLabel: label,
    rawCount,
  }
}
