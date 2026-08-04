/**
 * Peso legislativo (assentos) a partir do sentido de voto por partido.
 * Não é alinhamento com cidadãos nem recomendação de voto.
 */
import { getComposicao, MAIORIA_ABSOLUTA_AR } from '@/data/composicaoAr'
import { partidos, sortPartidosAlfa, votoLabel } from '@/data/partidos'

/**
 * @param {Record<string, string>} resultadoPartidos
 * @param {string} [legislatura]
 */
export function aritmeticaParlamentar(resultadoPartidos, legislatura) {
  const comp = getComposicao(legislatura)
  const map = resultadoPartidos && typeof resultadoPartidos === 'object' ? resultadoPartidos : {}

  let favor = 0
  let contra = 0
  let abstencao = 0
  let semSentido = 0
  let assentosCobertos = 0

  const rows = []

  for (const p of partidos) {
    const seats = Number(comp.assentos[p.id] || 0)
    const voto = map[p.id] || null
    if (!seats && !voto) continue

    if (voto === 'favor') {
      favor += seats
      assentosCobertos += seats
    } else if (voto === 'contra') {
      contra += seats
      assentosCobertos += seats
    } else if (voto === 'abstencao') {
      abstencao += seats
      assentosCobertos += seats
    } else {
      semSentido += seats
    }

    rows.push({
      id: p.id,
      sigla: p.sigla,
      nome: p.nome,
      cor: p.cor,
      assentos: seats,
      voto: voto || 'nao_participou',
      votoLabel: votoLabel[voto] || 'Sem registo',
    })
  }

  // partidos no hemiciclo sem UI (ex. JPP)
  let outrosAssentos = 0
  for (const n of Object.values(comp.outros || {})) {
    outrosAssentos += Number(n) || 0
  }

  const total = comp.total
  const maioriaAbsoluta = MAIORIA_ABSOLUTA_AR
  /** Entre quem “conta” para maioria simples favor vs contra (abstenções fora deste confronto). */
  const emDisputa = favor + contra
  const passaSimples = emDisputa > 0 && favor > contra
  const empateSimples = emDisputa > 0 && favor === contra
  const passaAbsoluta = favor >= maioriaAbsoluta

  // % sobre 230 (peso no hemiciclo)
  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0)

  return {
    legislatura: legislatura || 'XVII',
    total,
    maioriaAbsoluta,
    favor,
    contra,
    abstencao,
    semSentido,
    outrosAssentos,
    assentosCobertos,
    emDisputa,
    passaSimples,
    empateSimples,
    passaAbsoluta,
    pctFavor: pct(favor),
    pctContra: pct(contra),
    pctAbstencao: pct(abstencao),
    /** Lista alfabética (regra UI) com assentos */
    rowsAlfa: sortPartidosAlfa(rows),
    /** Mesma lista por peso de bancada (só neste painel de aritmética) */
    rowsPorPeso: [...rows].sort((a, b) => b.assentos - a.assentos || a.sigla.localeCompare(b.sigla, 'pt')),
    fonte: comp.fonte,
    actualizado: comp.actualizado,
  }
}

export function temAritmeticaUtil(resultadoPartidos) {
  if (!resultadoPartidos || typeof resultadoPartidos !== 'object') return false
  return Object.values(resultadoPartidos).some((v) => v && v !== 'nao_participou')
}
