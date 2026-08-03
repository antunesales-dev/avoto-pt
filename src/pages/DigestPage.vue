<template>
  <div class="page-shell">
    <h1 class="page-title">Digest diário</h1>
    <p class="page-subtitle">
      Resumo factual do que foi a voto e <strong>como</strong> votaram os partidos na AR, lado a
      lado com os votos dos cidadãos registados (quando existirem). Fonte: dados oficiais na
      plataforma — sem interpretação política.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      O digest é gerado a partir da base (sync AR + contagens). Jobs diários:
      <code>ar-sync</code> → <code>daily-digest</code>.
    </div>

    <p v-if="finance.loading" class="muted">A carregar…</p>
    <p v-else-if="!finance.digests.length" class="muted">
      Ainda não há digests. O job diário preenche esta lista.
    </p>

    <div class="digest-list">
      <article v-for="d in finance.digests" :key="d.id" class="av-card digest">
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

          <div v-if="d.items?.length" class="digest__items">
            <div v-for="(it, idx) in d.items" :key="idx" class="digest-item">
              <router-link
                v-if="it.iniciativa_id"
                :to="`/iniciativas/${it.iniciativa_id}`"
                class="digest-item__link"
              >
                {{ it.id_oficial || it.iniciativa_id }}
              </router-link>
              <span v-else class="badge badge--muted">{{ it.id_oficial || '—' }}</span>
              <p class="digest-item__titulo">{{ it.titulo }}</p>
              <p class="digest-item__meta">
                Estado AR: <strong>{{ it.estado || '—' }}</strong>
                <template v-if="it.votos_cidadaos">
                  · Cidadãos: {{ it.votos_cidadaos.favor }} a favor /
                  {{ it.votos_cidadaos.contra }} contra /
                  {{ it.votos_cidadaos.abstencao }} abs.
                </template>
              </p>
            </div>
          </div>

          <div v-if="d.source_urls?.length" class="digest__sources">
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
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { formatDate } from '@/data/partidos'
import { useFinanceStore } from '@/stores/finance'

const finance = useFinanceStore()

onMounted(() => {
  finance.loadDigests().catch(console.error)
})
</script>

<style scoped lang="scss">
.muted {
  color: var(--pt-muted);
  font-weight: 600;
}
.digest-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  margin: 0 0 1rem;
  color: var(--pt-muted);
}
.digest__items {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  border-top: 1px solid var(--pt-line);
  padding-top: 0.85rem;
}
.digest-item__link {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
}
.digest-item__titulo {
  margin: 0.25rem 0;
  font-weight: 600;
  color: var(--pt-navy);
}
.digest-item__meta {
  margin: 0;
  font-size: 0.85rem;
  color: var(--pt-muted);
}
.digest__sources {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  a {
    font-size: 0.85rem;
    font-weight: 700;
  }
}
</style>
