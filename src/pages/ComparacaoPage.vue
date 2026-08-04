<template>
  <div class="page-shell">
    <h1 class="page-title">Comparação global</h1>
    <p class="page-subtitle">
      Alinhamento entre o voto agregado dos cidadãos e o voto de cada partido nas iniciativas com
      resultado oficial. Não é ranking político nem “quem manda” no hemiciclo.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      <strong>Como lemos a ordem dos partidos:</strong> as colunas da matriz e as listas sem
      métrica estão em <strong>ordem alfabética por sigla</strong> (BE → … → PSD), de propósito —
      para não enviesar. Só as barras de “alinhamento médio” ordenam por percentagem; em empate,
      volta o alfabético. Ver também
      <router-link to="/como-funciona">Como funciona</router-link>.
    </div>

    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad">
        <h2 class="section-title">Alinhamento médio por partido</h2>
        <p class="section-hint" style="margin-top: -0.35rem; margin-bottom: 0.85rem">
          Ordenado do maior para o menor % (métrica). Empate → alfabético por sigla.
        </p>
        <div class="align-list">
          <div v-for="row in mediaPartidos" :key="row.id" class="align-row">
            <div class="align-row__head">
              <span class="party-cell">
                <span class="party-dot" :style="{ background: row.cor }" />
                <strong>{{ row.sigla }}</strong>
              </span>
              <span class="align-row__pct">{{ row.media }}%</span>
            </div>
            <div class="mini-bar">
              <div class="mini-bar__fill" :style="{ width: row.media + '%', background: row.cor }" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="av-card">
      <div class="av-card-pad">
        <h2 class="section-title">Matriz por iniciativa</h2>
        <p class="section-hint" style="margin-top: -0.35rem; margin-bottom: 0.85rem">
          Colunas dos partidos em <strong>ordem alfabética de sigla</strong> (não por tamanho de
          bancada).
        </p>

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

        <div class="av-table-wrap">
          <table class="av-table">
            <thead>
              <tr>
                <th>Iniciativa</th>
                <th v-for="p in partidos" :key="p.id">{{ p.sigla }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ini in pageItems" :key="ini.id">
                <td>
                  <router-link :to="`/iniciativas/${ini.id}`" class="ini-link">
                    {{ ini.idOficial }}
                  </router-link>
                </td>
                <td v-for="p in partidos" :key="p.id">
                  <span
                    class="cell-voto"
                    :class="'cell-voto--' + (ini.resultadoPartidos[p.id] || 'nao_participou')"
                  >
                    {{ shortVoto(ini.resultadoPartidos[p.id]) }}
                  </span>
                </td>
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
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ListPager from '@/components/ListPager.vue'
import { usePagination } from '@/composables/usePagination'
import { partidos, alinhamentoCidadaosPartido, hasPartyVotes } from '@/data/partidos'
import { useDataStore } from '@/stores/data'

const data = useDataStore()

const votadas = computed(() =>
  data.iniciativas.filter(
    (i) => i.dataVotacao && (i.estado !== 'em_discussao' || hasPartyVotes(i.resultadoPartidos)),
  ),
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
} = usePagination(votadas, { defaultSize: 20, sizes: [10, 20, 50] })

function setPageSize(n) {
  pageSize.value = n
}

const mediaPartidos = computed(() =>
  partidos
    .map((p) => {
      const vals = votadas.value
        .map((i) => alinhamentoCidadaosPartido(i, p.id))
        .filter((v) => v != null)
      const media =
        vals.length === 0
          ? 0
          : Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      return { ...p, media, n: vals.length }
    })
    // Métrica (alinhamento médio) → se empate ou sem dados, alfabético (sem enviesar)
    .sort((a, b) => {
      if (a.n === 0 && b.n === 0) return a.sigla.localeCompare(b.sigla, 'pt', { sensitivity: 'base' })
      if (a.n === 0) return 1
      if (b.n === 0) return -1
      if (b.media !== a.media) return b.media - a.media
      return a.sigla.localeCompare(b.sigla, 'pt', { sensitivity: 'base' })
    }),
)

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
  margin-bottom: 0.35rem;
}
.party-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
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
}
.cell-voto {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  font-size: 0.78rem;
  font-weight: 800;
  border: 1px solid transparent;
  &--favor {
    background: var(--pt-green);
    border-color: var(--pt-green-dark);
    color: #fff;
  }
  &--contra {
    background: var(--pt-red);
    border-color: var(--pt-red-dark);
    color: #fff;
  }
  &--abstencao {
    background: var(--pt-gold);
    border-color: #b8860b;
    color: #3d3200;
  }
  &--nao_participou {
    color: #a8a29e;
    background: #f0eeea;
    border-color: var(--pt-line);
  }
}
</style>
