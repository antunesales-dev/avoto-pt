<template>
  <div class="page-shell" v-if="item">
    <router-link to="/comunicados" class="back">← Comunicados</router-link>

    <div class="av-card">
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
        <p v-if="item.resumo" class="body">{{ item.resumo }}</p>
        <p class="hint">
          Texto completo e actualizações oficiais estão no portal do Governo. A A Voto não substitui
          a fonte nem permite votar nestes itens.
        </p>
        <a
          class="btn btn--primary"
          style="margin-top: 1rem"
          :href="item.url_oficial"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir em portugal.gov.pt ↗
        </a>
      </div>
    </div>
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
</style>
