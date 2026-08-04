<template>
  <div v-if="arit" class="pwp">
    <h2 class="section-title">Peso no hemiciclo (assentos)</h2>
    <p class="hint">
      Estimativa: sentido de voto do grupo parlamentar × número de deputados da bancada na
      legislatura {{ arit.legislatura }} (total {{ arit.total }}).
      <strong>Não</strong> é recomendação de voto nem ranking político — só aritmética: quantos
      lugares “puxam” a favor, contra ou se abstêm. Abstenção não conta como favor nem como
      contra, e pode decidir se há (ou não) maioria.
    </p>

    <div class="pwp__totals">
      <div class="pwp__stat pwp__stat--favor">
        <span class="pwp__stat-l">A favor</span>
        <span class="pwp__stat-v">{{ formatNumber(arit.favor) }}</span>
        <span class="pwp__stat-s">{{ arit.pctFavor }}% dos 230</span>
      </div>
      <div class="pwp__stat pwp__stat--contra">
        <span class="pwp__stat-l">Contra</span>
        <span class="pwp__stat-v">{{ formatNumber(arit.contra) }}</span>
        <span class="pwp__stat-s">{{ arit.pctContra }}% dos 230</span>
      </div>
      <div class="pwp__stat pwp__stat--abst">
        <span class="pwp__stat-l">Abstenção</span>
        <span class="pwp__stat-v">{{ formatNumber(arit.abstencao) }}</span>
        <span class="pwp__stat-s">{{ arit.pctAbstencao }}% dos 230</span>
      </div>
    </div>

    <div class="pwp__bar" role="img" :aria-label="ariaBar">
      <div
        v-if="arit.favor"
        class="pwp__seg pwp__seg--favor"
        :style="{ width: barPct(arit.favor) + '%' }"
      />
      <div
        v-if="arit.contra"
        class="pwp__seg pwp__seg--contra"
        :style="{ width: barPct(arit.contra) + '%' }"
      />
      <div
        v-if="arit.abstencao"
        class="pwp__seg pwp__seg--abst"
        :style="{ width: barPct(arit.abstencao) + '%' }"
      />
      <div
        v-if="restoBarra > 0"
        class="pwp__seg pwp__seg--resto"
        :style="{ width: barPct(restoBarra) + '%' }"
      />
    </div>

    <div class="pwp__leitura">
      <p v-if="arit.emDisputa > 0">
        <strong>Maioria simples (favor vs contra):</strong>
        <template v-if="arit.passaSimples">
          mais assentos a favor ({{ formatNumber(arit.favor) }} &gt;
          {{ formatNumber(arit.contra) }}).
        </template>
        <template v-else-if="arit.empateSimples">
          empate ({{ formatNumber(arit.favor) }} = {{ formatNumber(arit.contra) }}).
        </template>
        <template v-else>
          mais assentos contra ({{ formatNumber(arit.contra) }} &gt;
          {{ formatNumber(arit.favor) }}).
        </template>
        As abstenções ({{ formatNumber(arit.abstencao) }}) não entram neste confronto directo —
        podem impedir ou facilitar uma maioria absoluta.
      </p>
      <p>
        <strong>Maioria absoluta</strong> ({{ arit.maioriaAbsoluta }} de {{ arit.total }}):
        <template v-if="arit.passaAbsoluta">
          os assentos a favor chegam ou ultrapassam o limiar ({{ formatNumber(arit.favor) }}).
        </template>
        <template v-else>
          os assentos a favor ({{ formatNumber(arit.favor) }}) ficam aquém de
          {{ arit.maioriaAbsoluta }}.
        </template>
      </p>
      <p v-if="estadoOficial" class="pwp__oficial">
        Resultado no registo da plataforma:
        <span class="badge" :class="estadoBadge">{{ estadoOficial }}</span>
        (fonte oficial; a estimativa de assentos é auxiliar).
      </p>
    </div>

    <div class="av-table-wrap" style="border: none; margin-top: 0.75rem">
      <table class="av-table">
        <thead>
          <tr>
            <th>Partido</th>
            <th>Assentos</th>
            <th>Sentido</th>
            <th>% hemiciclo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in arit.rowsAlfa" :key="row.id">
            <td>
              <span class="party-cell">
                <span class="party-dot" :style="{ background: row.cor }" />
                {{ row.sigla }}
              </span>
            </td>
            <td class="num">{{ formatNumber(row.assentos) }}</td>
            <td>
              <span class="sense" :class="'sense--' + row.voto">{{ row.votoLabel }}</span>
            </td>
            <td class="num">{{ pctHemiciclo(row.assentos) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="foot">
      {{ arit.fonte }} Actualizado {{ arit.actualizado }}. Partidos sem assentos no mapa ou sem
      sentido de voto nesta iniciativa não entram na soma. Ordem da tabela: alfabética por sigla.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { estadosLabel, formatNumber } from '@/data/partidos'
import { aritmeticaParlamentar, temAritmeticaUtil } from '@/lib/partyWeight'

const props = defineProps({
  resultadoPartidos: { type: Object, default: null },
  legislatura: { type: String, default: 'XVII' },
  estado: { type: String, default: null },
})

const arit = computed(() => {
  if (!temAritmeticaUtil(props.resultadoPartidos)) return null
  return aritmeticaParlamentar(props.resultadoPartidos, props.legislatura)
})

const restoBarra = computed(() => {
  if (!arit.value) return 0
  return Math.max(
    0,
    arit.value.total - arit.value.favor - arit.value.contra - arit.value.abstencao,
  )
})

const estadoOficial = computed(() =>
  props.estado ? estadosLabel[props.estado] || props.estado : null,
)

const estadoBadge = computed(() => {
  if (props.estado === 'aprovado') return 'badge--green'
  if (props.estado === 'rejeitado') return 'badge--red'
  if (props.estado === 'em_discussao') return 'badge--gold'
  return 'badge--muted'
})

const ariaBar = computed(() => {
  if (!arit.value) return ''
  return `Estimativa de assentos: ${arit.value.favor} a favor, ${arit.value.contra} contra, ${arit.value.abstencao} abstenção`
})

function barPct(n) {
  if (!arit.value?.total) return 0
  return Math.max(0, (Number(n) / arit.value.total) * 100)
}

function pctHemiciclo(seats) {
  if (!arit.value?.total) return 0
  return Math.round((Number(seats) / arit.value.total) * 1000) / 10
}
</script>

<style scoped lang="scss">
.hint {
  margin: -0.35rem 0 1rem;
  font-size: 0.88rem;
  color: var(--pt-muted);
  font-weight: 500;
  line-height: 1.5;
}

.pwp__totals {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: 1fr;
  margin-bottom: 0.75rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.pwp__stat {
  border: 1.5px solid var(--pt-line);
  border-left-width: 4px;
  border-radius: 2px;
  padding: 0.65rem 0.75rem;
  background: var(--pt-white);

  &--favor {
    border-left-color: var(--pt-green);
    background: #e8f5ee;
  }
  &--contra {
    border-left-color: var(--pt-red);
    background: #fdeceb;
  }
  &--abst {
    border-left-color: #b8860b;
    background: #fbf3d5;
  }
}

.pwp__stat-l {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pt-muted);
}

.pwp__stat-v {
  display: block;
  font-family: var(--font-display);
  font-size: 1.65rem;
  font-weight: 700;
  color: var(--pt-navy);
  line-height: 1.15;
  margin: 0.15rem 0;
}

.pwp__stat-s {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--pt-muted);
}

.pwp__bar {
  display: flex;
  height: 14px;
  border: 1px solid var(--pt-line);
  background: var(--pt-paper-2);
  margin-bottom: 1rem;
  overflow: hidden;
}

.pwp__seg {
  height: 100%;
  min-width: 2px;
  &--favor {
    background: var(--pt-green);
  }
  &--contra {
    background: var(--pt-red);
  }
  &--abst {
    background: #c9a227;
  }
  &--resto {
    background: #ddd9d0;
  }
}

.pwp__leitura {
  p {
    margin: 0 0 0.55rem;
    font-size: 0.92rem;
    line-height: 1.5;
    color: var(--pt-ink);
  }
}

.pwp__oficial {
  margin-top: 0.75rem !important;
}

.num {
  font-family: var(--font-mono);
  font-weight: 600;
  white-space: nowrap;
}

.sense {
  font-weight: 800;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;

  &--favor {
    color: var(--pt-green-dark);
  }
  &--contra {
    color: var(--pt-red-dark);
  }
  &--abstencao {
    color: #6b5500;
  }
  &--nao_participou {
    color: var(--pt-muted);
  }
}

.foot {
  margin: 0.75rem 0 0;
  font-size: 0.78rem;
  color: var(--pt-muted);
  line-height: 1.45;
}
</style>
