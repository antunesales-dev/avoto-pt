/**
 * PostgREST/Supabase devolve no máx. 1000 linhas por pedido (default).
 * Busca em páginas até esgotar.
 *
 * @param {() => import('@supabase/supabase-js').PostgrestFilterBuilder} buildQuery
 *   Função que devolve uma query fresca (sem range).
 * @param {number} pageSize
 */
export async function fetchAllRows(buildQuery, pageSize = 1000) {
  const out = []
  let from = 0
  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await buildQuery().range(from, to)
    if (error) throw error
    const batch = data || []
    out.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
    // segurança
    if (from > 100_000) break
  }
  return out
}
