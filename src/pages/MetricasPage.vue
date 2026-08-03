<template>
  <div class="page-shell">
    <h1 class="page-title">Métricas públicas</h1>
    <p class="page-subtitle">
      Transparência total sobre utilização e participação. Tudo o que for relevante para avaliar a
      amostra deve ser público. Números de demonstração.
    </p>

    <div class="stats-grid" style="margin-bottom: 1.25rem">
      <StatCard
        label="Cidadãos registados"
        :value="formatNumber(metricasGlobais.cidadaosRegistados)"
        icon="groups"
      />
      <StatCard
        label="Votos emitidos"
        :value="formatNumber(metricasGlobais.votosEmitidos)"
        icon="how_to_vote"
        accent="var(--pt-red)"
        tint="rgba(218, 41, 28, 0.1)"
      />
      <StatCard
        label="Iniciativas disponíveis"
        :value="formatNumber(metricasGlobais.iniciativasDisponiveis)"
        icon="gavel"
        accent="var(--pt-navy)"
        tint="rgba(0, 32, 91, 0.08)"
      />
      <StatCard
        label="Participação média"
        :value="metricasGlobais.taxaParticipacaoMedia + '%'"
        icon="percent"
        accent="#7a5f00"
        tint="rgba(241, 191, 0, 0.18)"
      />
    </div>

    <div class="two-col">
      <section class="av-card">
        <div class="av-card-pad">
          <h2 class="section-title">Participação por iniciativa (demo)</h2>
          <div class="av-table-wrap" style="border: none">
            <table class="av-table">
              <thead>
                <tr>
                  <th>Iniciativa</th>
                  <th>Votos cidadãos</th>
                  <th>Taxa*</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in participacao" :key="row.id">
                  <td>
                    <router-link :to="`/iniciativas/${row.id}`" class="link">
                      {{ row.idOficial }}
                    </router-link>
                  </td>
                  <td>{{ formatNumber(row.total) }}</td>
                  <td>{{ row.taxa }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="foot-note">
            * Taxa = votos na iniciativa / cidadãos registados ({{ formatNumber(metricasGlobais.cidadaosRegistados) }}).
            Em produção a taxa usa o total real à data de cada votação.
          </p>
        </div>
      </section>

      <section class="av-card">
        <div class="av-card-pad">
          <h2 class="section-title">Distribuição por tema</h2>
          <div class="theme-bars">
            <div v-for="t in porTema" :key="t.tema" class="theme-row">
              <div class="theme-row__head">
                <span>{{ t.tema }}</span>
                <span>{{ t.count }}</span>
              </div>
              <div class="mini-bar">
                <div
                  class="mini-bar__fill"
                  :style="{ width: (t.count / maxTema) * 100 + '%' }"
                />
              </div>
            </div>
          </div>

          <h2 class="section-title" style="margin-top: 1.5rem">Exportação</h2>
          <p class="export-text">
            Em produção: CSV e JSON públicos de agregados (sem dados pessoais). Nesta demo:
          </p>
          <div class="export-actions">
            <button type="button" class="btn btn--outline btn--sm" @click="exportJson">
              Descarregar JSON demo
            </button>
          </div>
        </div>
      </section>
    </div>

    <p class="update">
      Dados actualizados em {{ formatDate(metricasGlobais.actualizadoEm) }} · Legislatura
      {{ metricasGlobais.legislatura }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StatCard from '@/components/StatCard.vue'
import {
  metricasGlobais,
  iniciativas,
  formatNumber,
  formatDate,
  totalVotos,
} from '@/data/mock'

const participacao = computed(() =>
  iniciativas.map((i) => {
    const total = totalVotos(i.votosCidadaos)
    const taxa =
      Math.round((total / metricasGlobais.cidadaosRegistados) * 1000) / 10
    return { id: i.id, idOficial: i.idOficial, total, taxa }
  }),
)

const porTema = computed(() => {
  const map = {}
  for (const i of iniciativas) {
    map[i.tema] = (map[i.tema] || 0) + 1
  }
  return Object.entries(map)
    .map(([tema, count]) => ({ tema, count }))
    .sort((a, b) => b.count - a.count)
})

const maxTema = computed(() => Math.max(...porTema.value.map((t) => t.count), 1))

function exportJson() {
  const payload = {
    aviso: 'Dados de demonstração da A Voto — não oficiais',
    metricas: metricasGlobais,
    iniciativas: iniciativas.map((i) => ({
      id: i.id,
      idOficial: i.idOficial,
      titulo: i.titulo,
      votosCidadaos: i.votosCidadaos,
      resultadoPartidos: i.resultadoPartidos,
    })),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'avoto-metricas-demo.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped lang="scss">
.two-col {
  display: grid;
  gap: 1rem;

  @media (min-width: 900px) {
    grid-template-columns: 1.2fr 1fr;
    align-items: start;
  }
}

.link {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--pt-green-dark);
}

.foot-note {
  margin: 0.85rem 0 0;
  font-size: 0.82rem;
  color: var(--pt-muted);
}

.theme-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.theme-row__head {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  color: var(--pt-navy);
}

.mini-bar {
  height: 8px;
  background: #f5f5f4;
  border-radius: 99px;
  overflow: hidden;

  &__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--pt-green), var(--pt-red));
    border-radius: 99px;
  }
}

.export-text {
  margin: 0 0 0.75rem;
  color: var(--pt-muted);
  font-size: 0.92rem;
}

.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.update {
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: var(--pt-muted);
  font-weight: 600;
}
</style>
