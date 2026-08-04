<template>
  <div class="page-shell">
    <h1 class="page-title">Métricas públicas</h1>
    <p class="page-subtitle">
      Transparência total sobre utilização e participação. Agregados apenas — sem dados pessoais.
    </p>

    <h2 class="section-title">Dados oficiais</h2>
    <div class="stats-grid" style="margin-bottom: 1.25rem">
      <StatCard
        label="Iniciativas (AR)"
        :value="formatNumber(m.iniciativas_disponiveis)"
        icon="gavel"
      />
      <StatCard
        label="Resumos do dia"
        :value="formatNumber(m.digests)"
        icon="today"
        accent="var(--pt-navy)"
        tint="rgba(0, 32, 91, 0.08)"
      />
      <StatCard
        label="Despesas (catálogo)"
        :value="formatNumber(m.despesas)"
        icon="account_balance"
        accent="var(--pt-red)"
        tint="rgba(218, 41, 28, 0.1)"
      />
      <StatCard
        label="Investimentos (≥100k, voto)"
        :value="formatNumber(m.investimentos)"
        icon="savings"
        accent="#7a5f00"
        tint="rgba(241, 191, 0, 0.18)"
      />
    </div>

    <h2 class="section-title">Participação cidadã</h2>
    <p v-if="!m.votos_emitidos && !m.cidadaos_registados" class="page-subtitle" style="margin-bottom: 1rem">
      Ainda não há participação cidadã: zero contas e zero votos. Os números oficiais acima vêm
      dos portais do Estado / AR — não inventamos utilizadores.
    </p>
    <p v-else-if="!m.votos_emitidos" class="page-subtitle" style="margin-bottom: 1rem">
      Há {{ formatNumber(m.cidadaos_registados) }} conta(s), mas ainda zero votos de cidadãos.
    </p>
    <div class="stats-grid" style="margin-bottom: 1.25rem">
      <StatCard
        label="Contas registadas"
        :value="formatNumber(m.cidadaos_registados)"
        icon="groups"
      />
      <StatCard
        label="Votos emitidos"
        :value="formatNumber(m.votos_emitidos)"
        icon="how_to_vote"
        accent="var(--pt-red)"
        tint="rgba(218, 41, 28, 0.1)"
      />
      <StatCard
        label="Participação média"
        :value="m.votos_emitidos ? m.taxa_participacao_media + '%' : '—'"
        icon="percent"
        accent="#7a5f00"
        tint="rgba(241, 191, 0, 0.18)"
      />
    </div>

    <section class="av-card">
      <div class="av-card-pad">
        <h2 class="section-title">Participação por iniciativa</h2>
        <p v-if="!participacaoComVotos.length" class="muted">
          Nenhuma iniciativa tem ainda votos de cidadãos.
        </p>
        <template v-else>
          <ListPager
            :page="page"
            :page-size="pageSize"
            :total="total"
            :total-pages="totalPages"
            :range-from="rangeFrom"
            :range-to="rangeTo"
            :page-window="pageWindow"
            :sizes="sizes"
            unit="iniciativas"
            @go="goPage"
            @update:page-size="setPageSize"
          />
          <div class="av-table-wrap" style="border: none">
            <table class="av-table">
              <thead>
                <tr>
                  <th>Iniciativa</th>
                  <th>Votos</th>
                  <th>Taxa*</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in pageItems" :key="row.id">
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
          <ListPager
            v-if="totalPages > 1"
            :page="page"
            :page-size="pageSize"
            :total="total"
            :total-pages="totalPages"
            :range-from="rangeFrom"
            :range-to="rangeTo"
            :page-window="pageWindow"
            :sizes="sizes"
            :show-size="false"
            unit="iniciativas"
            @go="goPage"
          />
        </template>
        <p class="foot-note">
          * Taxa = votos nesta iniciativa / contas registadas
          ({{ formatNumber(m.cidadaos_registados) }}). Só listamos iniciativas com pelo menos 1
          voto.
        </p>
        <button type="button" class="btn btn--outline btn--sm" style="margin-top: 1rem" @click="exportJson">
          Exportar JSON (agregados)
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ListPager from '@/components/ListPager.vue'
import StatCard from '@/components/StatCard.vue'
import { usePagination } from '@/composables/usePagination'
import { formatNumber, totalVotos } from '@/data/partidos'
import { useDataStore } from '@/stores/data'

const data = useDataStore()
const m = computed(() => data.metricas)

const participacaoComVotos = computed(() =>
  data.iniciativas
    .map((i) => {
      const total = totalVotos(i.votosCidadaos)
      const base = m.value.cidadaos_registados || 0
      const taxa = base ? Math.round((total / base) * 1000) / 10 : 0
      return { id: i.id, idOficial: i.idOficial, total, taxa }
    })
    .filter((r) => r.total > 0),
)

const {
  page,
  pageSize,
  sizes,
  total,
  totalPages,
  rangeFrom,
  rangeTo,
  pageItems,
  pageWindow,
  goPage,
} = usePagination(participacaoComVotos, { defaultSize: 20, sizes: [10, 20, 50] })

function setPageSize(n) {
  pageSize.value = n
}

function exportJson() {
  const payload = {
    metricas: m.value,
    iniciativas: data.iniciativas.map((i) => ({
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
  a.download = 'avoto-metricas.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped lang="scss">
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
.muted {
  margin: 0 0 0.75rem;
  color: var(--pt-muted);
  font-weight: 600;
}
</style>

