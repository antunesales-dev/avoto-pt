/** Auth for cron / service_role edge functions */
export function authorized(req: Request): boolean {
  const cron = Deno.env.get('AVOTO_CRON_SECRET') || ''
  const headerSecret = req.headers.get('x-avoto-cron-secret') || ''
  if (cron && headerSecret && headerSecret === cron) return true

  const auth = req.headers.get('Authorization') || ''
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (service && auth === `Bearer ${service}`) return true

  return false
}

/**
 * Chave do índice de pesquisa do portugal.gov.pt.
 * Só aceita o header `x-gov-search-key` de um chamador autorizado (cron secret / service_role);
 * caso contrário (ou header vazio) usa `GOV_SEARCH_KEY` do ambiente. Nunca registar o valor.
 */
export function govSearchKey(req: Request, envKey = Deno.env.get('GOV_SEARCH_KEY') || ''): string {
  if (authorized(req)) {
    const fromHeader = (req.headers.get('x-gov-search-key') || '').trim()
    if (fromHeader) return fromHeader
  }
  return envKey.trim()
}

/** Comparação em tempo constante (SHA-256 de ambos + XOR), sem curto-circuito no conteúdo. */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ])
  const x = new Uint8Array(ha)
  const y = new Uint8Array(hb)
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

/**
 * Exige o header `x-avoto-cron-secret` igual a `AVOTO_CRON_SECRET`.
 * Falha fechado: sem secret no servidor ou sem header → false (o service_role sozinho não chega).
 */
export async function cronSecretOk(req: Request): Promise<boolean> {
  const cron = Deno.env.get('AVOTO_CRON_SECRET') || ''
  const headerSecret = req.headers.get('x-avoto-cron-secret') || ''
  if (!cron || !headerSecret) return false
  return await safeEqual(headerSecret, cron)
}
