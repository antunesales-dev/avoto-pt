<template>
  <div class="page-shell">
    <h1 class="page-title">Comunicados</h1>
    <p class="page-subtitle">
      Comunicados e notícias oficiais do Governo (portugal.gov.pt) — consulta, com link à fonte.
      As nomeações de membros do Governo não entram nesta lista.
    </p>

    <div class="filter-row">
      <button
        v-for="t in tipos"
        :key="t.id"
        type="button"
        class="chip-btn"
        :class="{ 'is-active': tipo === t.id }"
        @click="tipo = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="temas.length" class="filter-row">
      <label class="tema-label" for="com-tema">Tema</label>
      <select id="com-tema" v-model="tema" class="tema-select">
        <option value="todos">Todos os temas</option>
        <option v-for="t in temas" :key="t.tema" :value="t.tema">{{ t.tema }} ({{ t.n }})</option>
      </select>
    </div>

    <DateRangeFilter
      v-model="periodo"
      label="Data de publicação"
      :options="periodoOpts"
      :count="filtrados.length"
      style="margin-bottom: 1rem"
    />

    <ListPager
      :page="page"
      :page-size="pageSize"
      :total="total"
      :total-pages="totalPages"
      :range-from="rangeFrom"
      :range-to="rangeTo"
      :page-window="pageWindow"
      :sizes="sizes"
      unit="comunicados"
      @go="goPage"
      @update:page-size="setPageSize"
    />

    <p v-if="loading" class="muted">A carregar comunicados…</p>

    <div v-else-if="pageItems.length" class="com-list">
      <article v-for="c in pageItems" :key="c.id" class="av-card com-card">
        <div class="flag-stripe" aria-hidden="true">
          <span class="flag-stripe__green" />
          <span class="flag-stripe__red" />
        </div>
        <div class="av-card-pad">
          <div class="meta">
            <span class="badge badge--navy">{{ tipoLabel(c.tipo) }}</span>
            <span class="badge badge--muted">Sem voto</span>
            <span class="badge badge--muted">{{ formatDate(c.publicado_em) }}</span>
            <span v-if="c.tema" class="badge badge--gold">{{ c.tema }}</span>
          </div>
          <h2 class="com-card__title">{{ c.titulo }}</h2>
          <p v-if="c.officials?.length || c.areas?.length" class="com-card__who">
            {{ [...(c.areas || []), ...(c.officials || [])].join(' · ') }}
          </p>
          <p v-if="excerpt(c)" class="com-card__resumo">{{ excerpt(c) }}</p>
          <div class="com-card__actions">
            <a
              class="btn btn--primary btn--sm"
              :href="c.url_oficial"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver na fonte oficial ↗
            </a>
            <router-link
              class="btn btn--ghost btn--sm"
              :to="`/comunicados/${c.id}`"
            >
              Ficha
            </router-link>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="av-card av-card-pad empty-box">
      <p v-if="!finance.comunicados.length" style="margin: 0 0 0.65rem">
        Ainda <strong>não há comunicados importados</strong>. Quando o job
        <code>comunicados-sync</code> correr, aparecem aqui com data e link oficiais.
      </p>
      <p v-else style="margin: 0 0 0.65rem">
        Nenhum registo com o filtro actual ({{ finance.comunicados.length }} na base).
      </p>
      <router-link to="/dados" class="btn btn--ghost btn--sm">Ver estado das importações</router-link>
    </div>

    <section v-if="digestsComConteudo.length" class="av-card" style="margin-top: 1.5rem">
      <div class="av-card-pad">
        <h2 class="section-title">Índice por dia</h2>
        <ul class="day-index">
          <li v-for="d in digestsComConteudo.slice(0, 12)" :key="d.id">
            <strong>{{ formatDate(d.digest_date) }}</strong>
            — {{ d.title }}
            <span class="muted sm"> ({{ itemCount(d) }})</span>
          </li>
        </ul>
      </div>
    </section>

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
      unit="comunicados"
      @go="goPage"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import DateRangeFilter from '@/components/DateRangeFilter.vue'
import ListPager from '@/components/ListPager.vue'
import { usePagination } from '@/composables/usePagination'
import { formatDate } from '@/data/partidos'
import { matchesDateRange, optionsForContext } from '@/lib/dateRange'
import { useFinanceStore } from '@/stores/finance'

const finance = useFinanceStore()
const { comunicados, comunicadosDigests } = storeToRefs(finance)
const loading = ref(true)
const periodo = ref('todos')
const tipo = ref('todos')
const tema = ref('todos')

const tipos = [
  { id: 'todos', label: 'Todos' },
  { id: 'comunicado_cm', label: 'Conselho de Ministros' },
  { id: 'noticia', label: 'Notícias' },
  { id: 'intervencao', label: 'Intervenções' },
]

const periodoOpts = computed(() =>
  optionsForContext(
    'comunicados',
    (comunicados.value || []).map((c) => c.publicado_em),
  ),
)

/** Temas presentes (notícias trazem área governativa → tema canónico). */
const temas = computed(() => {
  const m = new Map()
  for (const c of comunicados.value || []) if (c.tema) m.set(c.tema, (m.get(c.tema) || 0) + 1)
  return [...m.entries()].map(([t, n]) => ({ tema: t, n })).sort((a, b) => a.tema.localeCompare(b.tema, 'pt'))
})

const filtrados = computed(() =>
  (comunicados.value || []).filter((c) => {
    if (c.tipo === 'nomeacao') return false
    if (tipo.value !== 'todos' && c.tipo !== tipo.value) return false
    if (tema.value !== 'todos' && c.tema !== tema.value) return false
    return matchesDateRange(c.publicado_em, periodo.value)
  }),
)

const digestsComConteudo = computed(() =>
  (comunicadosDigests.value || []).filter((d) => itemCount(d) > 0),
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
  resetPage,
} = usePagination(filtrados, { defaultSize: 12, sizes: [12, 24, 48], queryPrefix: 'com' })

watch([periodo, tipo, tema], () => resetPage())

function setPageSize(n) {
  pageSize.value = Number(n) || 12
}

function tipoLabel(t) {
  const m = {
    comunicado_cm: 'Conselho de Ministros',
    noticia: 'Notícia',
    intervencao: 'Intervenção',
    outro: 'Oficial',
  }
  return m[t] || t
}

function itemCount(d) {
  return Number(d?.items?.count ?? d?.items?.items?.length ?? 0)
}

/** Resumo curto para lista: preferir resumo; senão início do corpo. */
function excerpt(c) {
  const r = String(c?.resumo || '').trim()
  if (r && r !== c.titulo) return r.length > 280 ? r.slice(0, 279) + '…' : r
  const body = String(c?.corpo || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!body) return r || ''
  return body.length > 280 ? body.slice(0, 279) + '…' : body
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([finance.loadComunicados(), finance.loadComunicadosDigests()])
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.muted {
  color: var(--pt-muted);
  font-weight: 600;
  margin: 0 0 1rem;
  &.sm {
    font-size: 0.85rem;
    font-weight: 500;
  }
}
.com-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.55rem;
}
.com-card__title {
  font-family: var(--font-display);
  font-size: 1.12rem;
  margin: 0 0 0.4rem;
  color: var(--pt-navy);
  line-height: 1.3;
}
.com-card__who {
  margin: -0.15rem 0 0.4rem;
  font-size: 0.82rem;
  color: var(--pt-muted);
  font-weight: 600;
}
.tema-label {
  font-weight: 700;
  font-size: 0.9rem;
  align-self: center;
}
.tema-select {
  font: inherit;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--pt-line);
  border-radius: 8px;
  background: #fff;
}
.com-card__resumo {
  margin: 0 0 0.85rem;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--pt-ink);
}
.com-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.day-index {
  margin: 0.5rem 0 0;
  padding-left: 1.15rem;
  line-height: 1.55;
}
.empty-box code {
  font-family: var(--font-mono);
  font-size: 0.85rem;
}
</style>
