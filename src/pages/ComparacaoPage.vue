<template>
  <div class="page-shell">
    <h1 class="page-title">Comparação global</h1>
    <p class="page-subtitle">
      Visão transversal do alinhamento entre o voto agregado dos cidadãos e o voto de cada partido
      nas iniciativas com resultado oficial. Valores de demonstração.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      O alinhamento médio é a média, por iniciativa já votada na AR, da percentagem de cidadãos que
      votaram no mesmo sentido que o partido. Não constitui ranking político nem recomendação.
    </div>

    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad">
        <h2 class="section-title">Alinhamento médio por partido</h2>
        <div class="align-list">
          <div v-for="row in mediaPartidos" :key="row.id" class="align-row">
            <div class="align-row__head">
              <span class="party-cell">
                <span class="party-dot" :style="{ background: row.cor }" />
                <strong>{{ row.sigla }}</strong>
                <span class="muted">{{ row.nome }}</span>
              </span>
              <span class="align-row__pct">{{ row.media }}%</span>
            </div>
            <div class="mini-bar">
              <div
                class="mini-bar__fill"
                :style="{ width: row.media + '%', background: row.cor }"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="av-card">
      <div class="av-card-pad">
        <h2 class="section-title">Matriz por iniciativa</h2>
        <div class="av-table-wrap">
          <table class="av-table">
            <thead>
              <tr>
                <th>Iniciativa</th>
                <th v-for="p in partidos" :key="p.id">{{ p.sigla }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ini in votadas" :key="ini.id">
                <td>
                  <router-link :to="`/iniciativas/${ini.id}`" class="ini-link">
                    {{ ini.idOficial }}
                  </router-link>
                </td>
                <td v-for="p in partidos" :key="p.id">
                  <span
                    class="cell-voto"
                    :class="'cell-voto--' + ini.resultadoPartidos[p.id]"
                    :title="votoLabel[ini.resultadoPartidos[p.id]]"
                  >
                    {{ shortVoto(ini.resultadoPartidos[p.id]) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="legend">
          <span><i class="s favor" /> F = A favor</span>
          <span><i class="s contra" /> C = Contra</span>
          <span><i class="s abst" /> A = Abstenção</span>
          <span><i class="s none" /> — = Sem votação</span>
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  iniciativas,
  partidos,
  alinhamentoCidadaosPartido,
  votoLabel,
} from '@/data/mock'

const votadas = computed(() =>
  iniciativas.filter((i) => i.estado !== 'em_discussao' && i.dataVotacao),
)

const mediaPartidos = computed(() => {
  return partidos
    .map((p) => {
      const vals = votadas.value
        .map((i) => alinhamentoCidadaosPartido(i, p.id))
        .filter((v) => v != null)
      const media =
        vals.length === 0
          ? 0
          : Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      return { ...p, media }
    })
    .sort((a, b) => b.media - a.media)
})

function shortVoto(v) {
  if (v === 'favor') return 'F'
  if (v === 'contra') return 'C'
  if (v === 'abstencao') return 'A'
  return '—'
}
</script>

<style scoped lang="scss">
.align-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.align-row__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.party-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.muted {
  color: var(--pt-muted);
  font-size: 0.88rem;
  font-weight: 500;
}

.align-row__pct {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--pt-navy);
}

.mini-bar {
  height: 10px;
  background: #f5f5f4;
  border-radius: 99px;
  overflow: hidden;
  border: 1px solid var(--pt-border);

  &__fill {
    height: 100%;
    border-radius: 99px;
    opacity: 0.9;
  }
}

.ini-link {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--pt-green-dark);

  &:hover {
    color: var(--pt-red);
  }
}

.cell-voto {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 800;

  &--favor {
    background: rgba(4, 106, 56, 0.15);
    color: var(--pt-green-dark);
  }
  &--contra {
    background: rgba(218, 41, 28, 0.15);
    color: var(--pt-red-dark);
  }
  &--abstencao {
    background: #f5f5f4;
    color: var(--pt-muted);
  }
  &--nao_participou {
    color: #a8a29e;
  }
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  margin: 1rem 0 0;
  font-size: 0.85rem;
  color: var(--pt-muted);
  font-weight: 600;

  .s {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    margin-right: 0.3rem;

    &.favor {
      background: var(--pt-green);
    }
    &.contra {
      background: var(--pt-red);
    }
    &.abst {
      background: #a8a29e;
    }
    &.none {
      background: #e7e5e4;
    }
  }
}
</style>
