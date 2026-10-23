/**
 * Leitura mínima de .docx (OOXML) sem dependências: ZIP (central directory) + inflateRaw do Node.
 * Devolve o XML de word/document.xml. Só o necessário para extrair parágrafos de textos da AR.
 */
import { inflateRawSync } from 'node:zlib'

const SIG_EOCD = 0x06054b50
const SIG_CEN = 0x02014b50
const SIG_LOC = 0x04034b50

/** @param {Buffer} buf @param {string} name @returns {Buffer|null} */
export function unzipEntry(buf, name) {
  if (!Buffer.isBuffer(buf) || buf.length < 22) return null
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return null
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== SIG_CEN) return null
    const method = buf.readUInt16LE(p + 10)
    const csize = buf.readUInt32LE(p + 20)
    const nlen = buf.readUInt16LE(p + 28)
    const elen = buf.readUInt16LE(p + 30)
    const clen = buf.readUInt16LE(p + 32)
    const loc = buf.readUInt32LE(p + 42)
    const entry = buf.toString('utf8', p + 46, p + 46 + nlen)
    if (entry === name) {
      if (buf.readUInt32LE(loc) !== SIG_LOC) return null
      const start = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28)
      const data = buf.subarray(start, start + csize)
      if (method === 0) return Buffer.from(data)
      if (method === 8) return inflateRawSync(data)
      return null
    }
    p += 46 + nlen + elen + clen
  }
  return null
}

export function isZip(buf) {
  return Buffer.isBuffer(buf) && buf.length > 4 && buf.readUInt32LE(0) === SIG_LOC
}

/** @returns {string|null} XML de word/document.xml */
export function docxDocumentXml(buf) {
  if (!isZip(buf)) return null
  const xml = unzipEntry(buf, 'word/document.xml')
  return xml ? xml.toString('utf8') : null
}
