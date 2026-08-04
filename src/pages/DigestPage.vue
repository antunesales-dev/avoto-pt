<template>
  <div class="page-shell">
    <h1 class="page-title">Resumo do dia</h1>
    <p class="page-subtitle">
      <strong>Boletim diário</strong> do que a plataforma reuniu nesse dia: leis e votações no
      Parlamento e despesa pública relevante. Não substitui as listas completas de
      <router-link to="/iniciativas">Iniciativas</router-link>,
      <router-link to="/despesa">Despesa</router-link>
      ou
      <router-link to="/investimentos">Investimentos</router-link>
      — é um atalho para o que aconteceu naquele dia.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      Factos oficiais e contagens da A Voto — não é notícias nem opinião. Sem inteligência
      artificial a inventar texto. Em cada lei: o que os partidos votaram e, se existir, o que
      os cidadãos votaram aqui.
    </div>

    <DateRangeFilter
      v-model="periodo"
      label="Dia do resumo"
      :count="filtrados.length"
      style="margin-bottom: 1rem"
    />

    <p v-if="finance.loading" class="muted">A carregar…</p>
    <p v-else-if="!finance.digests.length" class="muted">
      Ainda não há resumos. Quando o sistema sincroniza os dados oficiais, aparece aqui um
      boletim por dia.
    </p>
    <p v-else-if="!filtrados.length" class="muted">
      Nenhum resumo neste período ({{ dateRangeLabel(periodo) }}).
    </p>

    <ListPager
      v-if="!finance.loading && filtrados.length"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :total-pages="totalPages"
      :range-from="rangeFrom"
      :range-to="rangeTo"
      :page-window="pageWindow"
      :sizes="sizes"
      unit="resumos"
      @go="goPage"
      @update:page-size="setPageSize"
    />

    <div class="digest-list">
      <article v-for="d in pageItems" :key="d.id" class="av-card digest">
        <div class="flag-stripe" aria-hidden="true">
          <span class="flag-stripe__green" />
          <span class="flag-stripe__red" />
        </div>
        <div class="av-card-pad">
          <div class="digest__head">
            <h2 class="digest__title">{{ d.title }}</h2>
            <span class="badge badge--navy">{{ formatDate(d.digest_date) }}</span>
          </div>
          <p class="digest__summary">{{ d.summary }}</p>
          <p class="digest__meta">
            <template v-if="d.generated_at">Compilado em {{ formatDate(d.generated_at) }} · </template>
            {{ sectionCountsLabel(d) }}
          </p>

          <!-- Parlamento -->
          <section v-if="sectionItems(d, 'iniciativas').length" class="digest-section">
            <h3 class="digest-section__title">No Parlamento — leis e votações</h3>
            <div
              v-for="(it, idx) in sectionItems(d, 'iniciativas').slice(0, sectionLimit)"
              :key="it.iniciativa_id || idx"
              class="digest-item"
            >
              <div class="digest-item__badges">
                <router-link
                  v-if="it.iniciativa_id"
                  :to="`/iniciativas/${it.iniciativa_id}`"
                  class="digest-item__id"
                >
                  {{ it.id_oficial || it.iniciativa_id }}
                </router-link>
                <span v-if="it.tipo" class="badge badge--navy">{{ it.tipo }}</span>
                <span v-if="it.estado" class="badge" :class="estadoBadge(it.estado)">
                  {{ estadoLabel(it.estado) }}
                </span>
                <span v-if="it.tema" class="badge badge--muted">{{ it.tema }}</span>
              </div>
              <h4 class="digest-item__titulo">{{ it.titulo || 'Sem título' }}</h4>
              <p v-if="it.data_votacao" class="digest-item__line">
                Votação AR: <strong>{{ formatDate(it.data_votacao) }}</strong>
              </p>
              <p v-if="it.descricao_oficial" class="digest-item__body">
                {{ truncate(it.descricao_oficial, 320) }}
              </p>
              <div class="digest-item__block">
                <h5 class="digest-item__h">O que cada partido votou (A–Z por sigla)</h5>
                <div v-if="partyEntries(it).length" class="party-list">
                  <PartyVoteBadge
                    v-for="row in partyEntries(it)"
                    :key="row.id"
                    :partido="row.partido"
                    :voto="row.voto"
                  />
                </div>
                <p v-else class="muted sm">Sem registo de votos por partido neste item.</p>
              </div>
              <div class="digest-item__block">
                <h5 class="digest-item__h">O que os cidadãos votaram na A Voto</h5>
                <VoteBar :votos="cidadaosVotos(it)" />
              </div>
              <router-link
                v-if="it.iniciativa_id"
                :to="`/iniciativas/${it.iniciativa_id}`"
                class="btn btn--ghost btn--sm"
              >
                Ver iniciativa
              </router-link>
            </div>
            <p v-if="sectionItems(d, 'iniciativas').length > sectionLimit" class="muted sm">
              + {{ sectionItems(d, 'iniciativas').length - sectionLimit }} no dia — ver
              <router-link to="/iniciativas">Iniciativas</router-link>.
            </p>
          </section>

          <!-- Despesa (única secção de dinheiro — evita repetir o mesmo contrato em “investimentos”) -->
          <section v-if="sectionItems(d, 'despesas').length" class="digest-section">
            <h3 class="digest-section__title">Despesa pública desse dia</h3>
            <p class="muted sm" style="margin: -0.25rem 0 0.75rem">
              Contratos com data nesse dia. Os de valor elevado também estão em
              <router-link to="/investimentos">Investimentos</router-link>
              para voto cidadão — a lista completa fica em
              <router-link to="/despesa">Despesa</router-link>.
            </p>
            <div
              v-for="(it, idx) in sectionItems(d, 'despesas').slice(0, sectionLimit)"
              :key="it.despesa_id || idx"
              class="digest-item"
            >
              <div class="digest-item__badges">
                <span class="badge badge--navy">{{ it.tipo || 'despesa' }}</span>
                <span v-if="it.categoria" class="badge badge--muted">{{ it.categoria }}</span>
                <span v-if="it.montante_eur != null" class="badge badge--gold">
                  {{ formatMoney(it.montante_eur) }}
                </span>
              </div>
              <h4 class="digest-item__titulo">{{ it.titulo }}</h4>
              <p class="digest-item__line">
                <template v-if="it.entidade">{{ it.entidade }}</template>
                <template v-if="it.data_publicacao">
                  · {{ formatDate(it.data_publicacao) }}
                </template>
              </p>
              <p v-if="it.descricao" class="digest-item__body">
                {{ truncate(it.descricao, 240) }}
              </p>
              <router-link
                v-if="it.despesa_id"
                :to="`/despesa/${it.despesa_id}`"
                class="btn btn--ghost btn--sm"
              >
                Ver detalhe
              </router-link>
              <router-link v-else to="/despesa" class="btn btn--ghost btn--sm">
                Ver despesa
              </router-link>
            </div>
            <p v-if="sectionItems(d, 'despesas').length > sectionLimit" class="muted sm">
              + {{ sectionItems(d, 'despesas').length - sectionLimit }} — ver
              <router-link to="/despesa">Despesa</router-link>.
            </p>
          </section>

          <!--
            Não listamos “investimentos” aqui: são o mesmo Portal Base (≥100k €),
            já cobertos em Despesa + página Investimentos (voto). Evita triplicar.
          -->

          <p
            v-if="!sectionItems(d, 'iniciativas').length && !sectionItems(d, 'despesas').length"
            class="muted sm"
          >
            Sem itens neste dia.
          </p>

          <div v-if="d.source_urls?.length" class="digest__sources">
            <span class="digest__sources-label">Fontes</span>
            <a
              v-for="s in d.source_urls"
              :key="s.url"
              :href="s.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ s.label || s.url }} ↗
            </a>
          </div>
        </div>
      </article>
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
      unit="resumos"
      @go="goPage"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import DateRangeFilter from '@/components/DateRangeFilter.vue'
import ListPager from '@/components/ListPager.vue'
import PartyVoteBadge from '@/components/PartyVoteBadge.vue'
import VoteBar from '@/components/VoteBar.vue'
import { usePagination } from '@/composables/usePagination'
import { estadosLabel, formatDate, getPartido, partidos } from '@/data/partidos'
import { dateRangeLabel, matchesDateRange } from '@/lib/dateRange'
import { useFinanceStore } from '@/stores/finance'

const finance = useFinanceStore()
const periodo = ref('todos')
const sectionLimit = 6

const filtrados = computed(() =>
  (finance.digests || []).filter((d) => matchesDateRange(d.digest_date, periodo.value)),
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
} = usePagination(filtrados, { defaultSize: 5, sizes: [5, 10, 20] })

function setPageSize(n) {
  pageSize.value = n
}

watch(periodo, () => resetPage())

function estadoLabel(estado) {
  return estadosLabel[estado] || estado || '—'
}

function estadoBadge(estado) {
  if (estado === 'aprovado') return 'badge--green'
  if (estado === 'rejeitado') return 'badge--red'
  return 'badge--muted'
}

function truncate(s, n) {
  const t = String(s || '')
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

function formatMoney(v) {
  if (v == null || v === '') return '—'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(v))
}

/** Suporta items.sections.* e array legado */
function sectionItems(d, key) {
  const items = d?.items
  if (!items) return []
  if (items.sections?.[key]?.items) return items.sections[key].items
  if (key === 'iniciativas') {
    if (Array.isArray(items.legacy_items)) return items.legacy_items
    if (Array.isArray(items)) return items
  }
  return []
}

function sectionCountsLabel(d) {
  const items = d?.items
  if (items?.sections) {
    const a = items.sections.iniciativas?.count ?? 0
    const b = items.sections.despesas?.count ?? 0
    // investimentos = subconjunto de despesa (não contar à parte no boletim)
    return `${a} lei(s)/votação(ões) · ${b} despesa(s)`
  }
  const n = Array.isArray(items) ? items.length : Array.isArray(items?.legacy_items) ? items.legacy_items.length : 0
  return `${n} item(ns)`
}

function cidadaosVotos(it) {
  const v = it?.votos_cidadaos || {}
  return {
    favor: Number(v.favor || 0),
    contra: Number(v.contra || 0),
    abstencao: Number(v.abstencao || 0),
  }
}

function partyEntries(it) {
  const map = it?.resultado_partidos || {}
  if (!map || typeof map !== 'object') return []
  const known = new Set(partidos.map((p) => p.id))
  const rows = partidos
    .filter((p) => map[p.id] != null && map[p.id] !== '')
    .map((p) => ({ id: p.id, partido: p, voto: map[p.id] }))
  for (const [id, voto] of Object.entries(map)) {
    if (known.has(id) || voto == null || voto === '') continue
    rows.push({
      id,
      partido: getPartido(id) || { id, sigla: id.toUpperCase(), cor: '#999' },
      voto,
    })
  }
  // Extra / desconhecidos: alfabético por sigla no fim da lista canónica
  return rows.sort((a, b) =>
    (a.partido?.sigla || a.id).localeCompare(b.partido?.sigla || b.id, 'pt', {
      sensitivity: 'base',
    }),
  )
}

onMounted(() => {
  finance.loadDigests().catch(console.error)
})
</script>

<style scoped lang="scss">
.muted {
  color: var(--pt-muted);
  font-weight: 600;
  &.sm {
    font-size: 0.85rem;
    font-weight: 500;
  }
}
.digest-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.digest__head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.digest__title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  margin: 0;
  color: var(--pt-navy);
}
.digest__summary {
  margin: 0 0 0.35rem;
  color: var(--pt-ink);
  line-height: 1.45;
}
.digest__meta {
  margin: 0 0 1rem;
  font-size: 0.82rem;
  color: var(--pt-muted);
}
.digest-section {
  border-top: 1px solid var(--pt-line);
  padding-top: 0.85rem;
  margin-top: 0.5rem;
}
.digest-section__title {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--pt-green-dark);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.digest-item {
  padding: 0.75rem 0;
  border-top: 1px dashed var(--pt-line);
  &:first-of-type {
    border-top: none;
    padding-top: 0;
  }
}
.digest-item__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
}
.digest-item__id {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
  color: var(--pt-green-dark);
}
.digest-item__titulo {
  margin: 0.15rem 0 0.35rem;
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--pt-navy);
  line-height: 1.3;
}
.digest-item__line {
  margin: 0 0 0.35rem;
  font-size: 0.88rem;
  color: var(--pt-muted);
}
.digest-item__body {
  margin: 0.4rem 0 0.65rem;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--pt-ink);
}
.digest-item__block {
  margin: 0.55rem 0;
}
.digest-item__h {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--pt-muted);
}
.party-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.digest__sources {
  margin-top: 1.15rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--pt-line);
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  a {
    font-size: 0.85rem;
    font-weight: 700;
  }
}
.digest__sources-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--pt-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
</style>
