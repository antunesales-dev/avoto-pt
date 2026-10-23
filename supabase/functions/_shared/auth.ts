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
