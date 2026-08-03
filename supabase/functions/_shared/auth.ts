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
