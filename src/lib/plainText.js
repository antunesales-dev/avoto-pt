/**
 * Texto de portais oficiais (Portal Base / SNS) por vezes vem com HTML
 * (ex. `<br/>` entre tipos de contrato). Leigos leem "br" como "Brasil".
 * Nunca renderizar tags crus na UI.
 */

export function plainOfficialText(value) {
  if (value == null || value === '') return ''
  return String(value)
    .replace(/<br\s*\/?>/gi, ' · ')
    .replace(/<\/p>/gi, ' · ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s*·\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .replace(/(?: · ){2,}/g, ' · ')
    .replace(/^ · | · $/g, '')
    .trim()
}
