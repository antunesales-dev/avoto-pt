<template>
  <div class="page-shell">
    <h1 class="page-title">Comparação global</h1>
    <p class="page-subtitle">
      Alinhamento médio dos votos de cidadãos com cada partido, e matriz do voto oficial na AR
      por iniciativa.
    </p>

    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad">
        <h2 class="section-title">Alinhamento médio por partido</h2>
        <p class="section-hint" style="margin-top: -0.35rem; margin-bottom: 0.85rem">
          Média, por partido, da percentagem de votos de cidadãos com o mesmo sentido que o
          partido (só iniciativas com participação).
        </p>

        <div v-if="!temBaseCidada" class="empty-align">
          <p>
            Ainda <strong>não há votos de cidadãos</strong> nas iniciativas votadas na AR
            ({{ formatNumber(totalVotosCidadaos) }} voto(s) no total ·
            {{ formatNumber(nIniciativasComVoto) }} iniciativa(s) com participação).
          </p>
          <p class="muted">
            Quando alguém registar votos, aparece aqui a média de alinhamento com cada partido.
            Até lá, use a matriz abaixo — o voto oficial dos partidos já está sincronizado.
          </p>
          <router-link
            v-if="!auth.isLoggedIn"
            class="btn btn--primary btn--sm"
            to="/entrar"
          >
            Entrar para votar
          </router-link>
          <router-link v-else class="btn btn--primary btn--sm" to="/iniciativas">
            Ver iniciativas e votar
          </router-link>
        </div>

        <template v-else>
          <p class="section-hint" style="margin-bottom: 0.85rem">
            Base:
            <strong>{{ formatNumber(totalVotosCidadaos) }}</strong> voto(s) em
            <strong>{{ formatNumber(nIniciativasComVoto) }}</strong> iniciativa(s).
          </p>
          <div class="align-list">
            <div v-for="row in mediaPartidos" :key="row.id" class="align-row">
              <div class="align-row__head">
                <span class="party-cell">
                  <span class="party-dot" :style="{ background: row.cor }" />
                  <strong>{{ row.sigla }}</strong>
                  <span v-if="row.n" class="align-row__n">n={{ row.n }}</span>
                </span>
                <span class="align-row__pct">
                  <template v-if="row.media == null">—</template>
                  <template v-else>{{ row.media }}%</template>
                </span>
              </div>
              <div class="mini-bar">
                <div
                  v-if="row.media != null"
                  class="mini-bar__fill"
                  :style="{ width: row.media + '%', background: row.cor }"
                />
              </div>
            </div>
          </div>
        </template>
      </div>
    </section>

    <section class="av-card">
      <div class="av-card-pad">
        <h2 class="section-title">Matriz por iniciativa</h2>
        <p class="section-hint" style="margin-top: -0.35rem; margin-bottom: 0.85rem">
          <strong>F</strong> a favor · <strong>C</strong> contra · <strong>A</strong> abstenção ·
          <strong>—</strong> sem registo. Colunas por ordem alfabética de sigla.
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
import {
  partidos,
  alinhamentoCidadaosPartido,
  hasPartyVotes,
  totalVotos,
  formatNumber,
} from '@/data/partidos'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'

const data = useDataStore()
const auth = useAuthStore()

const votadas = computed(() =>
  data.iniciativas.filter(
    (i) => i.dataVotacao && (i.estado !== 'em_discussao' || hasPartyVotes(i.resultadoPartidos)),
  ),
)

const nIniciativasComVoto = computed(
  () => votadas.value.filter((i) => totalVotos(i.votosCidadaos) > 0).length,
)

const totalVotosCidadaos = computed(() =>
  votadas.value.reduce((s, i) => s + totalVotos(i.votosCidadaos), 0),
)

/** Só faz sentido mostrar % quando há pelo menos um voto de cidadão na amostra. */
const temBaseCidada = computed(() => totalVotosCidadaos.value > 0)

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
      // Só iniciativas com votos de cidadãos entram na média (alinhamento devolve null sem base)
      const vals = votadas.value
        .map((i) => alinhamentoCidadaosPartido(i, p.id))
        .filter((v) => v != null)
      const media =
        vals.length === 0
          ? null
          : Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      return { ...p, media, n: vals.length }
    })
    // Métrica (alinhamento médio) → se empate ou sem dados, alfabético (sem enviesar)
    .sort((a, b) => {
      if (a.media == null && b.media == null) {
        return a.sigla.localeCompare(b.sigla, 'pt', { sensitivity: 'base' })
      }
      if (a.media == null) return 1
      if (b.media == null) return -1
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
.empty-align {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.25rem 0 0.15rem;
  p {
    margin: 0;
    line-height: 1.45;
    color: var(--pt-ink, #1c1917);
  }
  .muted {
    color: #78716c;
    font-size: 0.92rem;
  }
  .btn {
    align-self: flex-start;
    margin-top: 0.25rem;
  }
}
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
.align-row__n {
  font-size: 0.75rem;
  color: #a8a29e;
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
