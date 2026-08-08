/**
 * Composição da Assembleia da República por legislatura (assentos / “peso” no hemiciclo).
 *
 * Serve para estimar a aritmética de uma votação a partir do sentido de voto do
 * grupo parlamentar × nº de deputados — NÃO é ranking político nem conselho de voto.
 *
 * Limitações (declaradas na UI):
 * - Assume voto coeso da bancada (o registo AR costuma ser por grupo, não por cabeça).
 * - Composição actualizada periodicamente; votações antigas na mesma legislatura
 *   podem ter tido números ligeiramente diferentes.
 * - Partidos fora do mapa (ex. JPP) contam em “outros / não mapeados”.
 *
 * Total legal: 230 deputados. Maioria absoluta: 116.
 */

/** @typedef {{ total: number, assentos: Record<string, number>, outros?: Record<string, number>, fonte: string, actualizado: string }} ComposicaoLeg */

/** @type {Record<string, ComposicaoLeg>} */
export const COMPOSICAO_AR = {
  /**
   * XVII Legislatura — composição do hemiciclo após legislativas de 2025
   * (PSD 89 · CH 60 · PS 58 · IL 9 · L 6 · PCP 3 · CDS 2 · BE 1 · PAN 1 · JPP 1).
   * Conferir em parlamento.pt quando houver alteração.
   */
  XVII: {
    total: 230,
    assentos: {
      psd: 89,
      chega: 60,
      ps: 58,
      il: 9,
      livre: 6,
      pcp: 3,
      cds: 2,
      be: 1,
      pan: 1,
    },
    outros: {
      jpp: 1,
    },
    fonte:
      'Composição da Assembleia da República (230 lugares). Números de bancada oficiais / hemiciclo; actualizar após eleições ou mudanças de grupo.',
    actualizado: '2026-08',
  },
}

export const MAIORIA_ABSOLUTA_AR = 116 // floor(230/2)+1

export function getComposicao(legislatura) {
  if (legislatura && COMPOSICAO_AR[legislatura]) return COMPOSICAO_AR[legislatura]
  // fallback: legislatura mais recente conhecida
  return COMPOSICAO_AR.XVII
}

export function assentosPartido(partidoId, legislatura) {
  const c = getComposicao(legislatura)
  return Number(c.assentos?.[partidoId] || 0)
}
