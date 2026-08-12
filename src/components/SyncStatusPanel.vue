<template>
  <div class="sync-panel">
    <p v-if="loading" class="muted">A carregar histórico de sincronização…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <template v-else>
      <p class="lead">
        Últimas importações automáticas a partir de portais oficiais. Isto é a
        <strong>data em que a A Voto copiou</strong> os dados — não a data oficial do
        acto (votação / publicação do contrato).
      </p>

      <div v-if="latestBySource.length" class="latest-grid">
        <div v-for="row in latestBySource" :key="row.source" class="latest av-card av-card-pad">
          <div class="latest__src">{{ sourceTitle(row.source) }}</div>
          <div class="latest__status" :class="'is-' + (row.status || 'unknown')">
            {{ statusLabel(row.status) }}
          </div>
          <div class="latest__when">
            <template v-if="row.finished_at">Terminou {{ formatDateTime(row.finished_at) }}</template>
            <template v-else-if="row.started_at">Iniciou {{ formatDateTime(row.started_at) }}</template>
            <template v-else>—</template>
          </div>
          <div class="latest__meta muted">
            {{ formatNumber(row.upserted) }} actualizado(s)
            <template v-if="row.skipped"> · {{ formatNumber(row.skipped) }} ignorado(s)</template>
          </div>
        </div>
      </div>
      <p v-else class="muted">Ainda não há registos de sincronização nesta base.</p>

      <h3 class="subh">Histórico recente</h3>
      <div class="av-table-wrap">
        <table class="av-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Fonte</th>
              <th>Estado</th>
              <th>Upserts</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in runs" :key="r.id">
              <td>{{ formatDateTime(r.finished_at || r.started_at) }}</td>
              <td>{{ sourceTitle(r.source) }}</td>
              <td>
                <span class="badge" :class="statusBadge(r.status)">{{ statusLabel(r.status) }}</span>
              </td>
              <td>{{ formatNumber(r.upserted) }}</td>
              <td class="wrap muted sm">
                <template v-if="r.error_message">{{ truncate(r.error_message, 80) }}</template>
                <template v-else-if="r.skipped">{{ r.skipped }} skipped</template>
                <template v-else>—</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { formatDateTime, formatNumber } from '@/data/partidos'
import { supabase } from '@/lib/supabase'

const loading = ref(true)
const error = ref(null)
const runs = ref([])

const SOURCE_TITLES = {
  'parlamento.pt': 'Assembleia da República (Dados Abertos)',
  despesa_publica: 'Despesa / Portal Base',
  despesa: 'Despesa / Portal Base',
  comunicados_gov: 'Comunicados (portugal.gov.pt)',
}

function sourceTitle(s) {
  return SOURCE_TITLES[s] || s || '—'
}

function statusLabel(s) {
  if (s === 'ok') return 'OK'
  if (s === 'error') return 'Erro'
  if (s === 'running') return 'A correr'
  return s || '—'
}

function statusBadge(s) {
  if (s === 'ok') return 'badge--green'
  if (s === 'error') return 'badge--red'
  return 'badge--muted'
}

function truncate(t, n) {
  const s = String(t || '')
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/** Uma linha por source (a mais recente). */
const latestBySource = computed(() => {
  const map = new Map()
  for (const r of runs.value) {
    const key = r.source || '?'
    if (!map.has(key)) map.set(key, r)
  }
  return [...map.values()]
})

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const { data, error: err } = await supabase
      .from('ar_sync_runs')
      .select('id, source, status, started_at, finished_at, upserted, skipped, error_message')
      .order('started_at', { ascending: false })
      .limit(20)
    if (err) throw err
    runs.value = data || []
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.lead {
  margin: 0 0 1rem;
  line-height: 1.45;
  color: var(--pt-ink);
}
.muted {
  color: var(--pt-muted);
  font-size: 0.9rem;
  &.sm {
    font-size: 0.82rem;
  }
}
.err {
  color: var(--pt-red);
  font-weight: 600;
}
.latest-grid {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  @media (min-width: 640px) {
    grid-template-columns: 1fr 1fr;
  }
}
.latest__src {
  font-weight: 800;
  color: var(--pt-navy);
  font-size: 0.95rem;
  margin-bottom: 0.35rem;
}
.latest__status {
  font-weight: 700;
  font-size: 0.85rem;
  &.is-ok {
    color: var(--pt-green-dark);
  }
  &.is-error {
    color: var(--pt-red);
  }
}
.latest__when {
  margin-top: 0.35rem;
  font-size: 0.9rem;
}
.latest__meta {
  margin-top: 0.25rem;
}
.subh {
  margin: 0.5rem 0 0.65rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--pt-navy);
}
.wrap {
  max-width: 16rem;
  white-space: normal;
}
</style>
