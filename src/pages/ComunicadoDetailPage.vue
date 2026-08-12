<template>
  <div class="page-shell" v-if="item">
    <router-link to="/comunicados" class="back">← Comunicados</router-link>

    <article class="av-card">
      <div class="flag-stripe" aria-hidden="true">
        <span class="flag-stripe__green" />
        <span class="flag-stripe__red" />
      </div>
      <div class="av-card-pad">
        <div class="meta">
          <span class="badge badge--navy">{{ tipoLabel(item.tipo) }}</span>
          <span class="badge badge--muted">Informação — sem voto</span>
          <span class="badge badge--muted">{{ formatDate(item.publicado_em) }}</span>
        </div>
        <h1 class="page-title" style="border: none; padding: 0; margin-top: 0.5rem">
          {{ item.titulo }}
        </h1>

        <div v-if="paragrafos.length" class="corpo">
          <p v-for="(p, i) in paragrafos" :key="i">{{ p }}</p>
        </div>
        <p v-else-if="item.resumo" class="body">{{ item.resumo }}</p>
        <p v-else class="hint">
          Ainda sem texto completo importado para este item. Usa a fonte oficial.
        </p>

        <p class="hint source-note">
          Texto extraído da fonte oficial para consulta na A Voto. Em caso de divergência, prevalece
          o portal do Governo. Não é voto nem posição da plataforma.
        </p>

        <div class="actions">
          <a
            class="btn btn--primary"
            :href="item.url_oficial"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir na fonte oficial ↗
          </a>
          <router-link class="btn btn--ghost" to="/comunicados">Voltar à lista</router-link>
        </div>
      </div>
    </article>
  </div>
  <div v-else class="page-shell">
    <h1 class="page-title">Comunicado não encontrado</h1>
    <router-link to="/comunicados" class="btn btn--primary">Voltar</router-link>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { formatDate } from '@/data/partidos'
import { useFinanceStore } from '@/stores/finance'

const route = useRoute()
const finance = useFinanceStore()

const item = computed(() => finance.getComunicado(route.params.id))

/** Parágrafos do corpo (texto já normalizado no sync). */
const paragrafos = computed(() => {
  const raw = String(item.value?.corpo || '').trim()
  if (!raw) return []
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean)
})

watch(
  () => route.params.id,
  async () => {
    if (!finance.comunicados.length) {
      await finance.loadComunicados().catch(console.error)
    }
  },
  { immediate: true },
)

function tipoLabel(t) {
  const m = {
    comunicado_cm: 'Conselho de Ministros',
    noticia: 'Notícia',
    intervencao: 'Intervenção',
    outro: 'Oficial',
  }
  return m[t] || t
}
</script>

<style scoped lang="scss">
.back {
  display: inline-block;
  font-weight: 700;
  margin-bottom: 1rem;
  text-decoration: none;
  color: var(--pt-green-dark);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.corpo {
  margin: 1rem 0 1.25rem;
  p {
    margin: 0 0 0.9rem;
    line-height: 1.6;
    font-size: 1.02rem;
    color: var(--pt-ink);
    &:last-child {
      margin-bottom: 0;
    }
  }
}
.body {
  margin: 0.75rem 0;
  line-height: 1.55;
}
.hint {
  margin: 0;
  font-size: 0.88rem;
  color: var(--pt-muted);
  line-height: 1.45;
}
.source-note {
  margin-top: 1.25rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--pt-line);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1.15rem;
}
</style>
