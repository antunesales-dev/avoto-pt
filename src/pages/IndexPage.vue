<template>
  <div class="page-shell stack-lg">
    <section class="hero">
      <div class="hero__eyebrow">Independente · Open source · Cidadania</div>
      <h1 class="hero__title">A Voto — Bancada Cidadã</h1>
      <p class="hero__lead">
        Plataforma cívica independente (não governamental), neutra e open source: vê, lado a lado,
        o que os cidadãos registados votam e o que cada partido votou no Parlamento. Login
        obrigatório para votar. Um voto por iniciativa — definitivo.
      </p>
      <div class="hero__actions">
        <router-link to="/iniciativas" class="btn btn--primary">Ver iniciativas</router-link>
        <router-link v-if="!auth.isLoggedIn" to="/registo" class="btn btn--outline">Criar conta</router-link>
        <router-link to="/como-funciona" class="btn btn--ghost">Como funciona</router-link>
      </div>
    </section>

    <section>
      <h2 class="section-title">Números da plataforma</h2>
      <div class="stats-grid">
        <StatCard
          label="Cidadãos registados"
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
          label="Iniciativas"
          :value="formatNumber(m.iniciativas_disponiveis)"
          icon="gavel"
          accent="var(--pt-navy)"
          tint="rgba(0, 32, 91, 0.08)"
        />
        <StatCard
          label="Participação média"
          :value="m.taxa_participacao_media + '%'"
          icon="trending_up"
          accent="#7a5f00"
          tint="rgba(241, 191, 0, 0.18)"
        />
      </div>
    </section>

    <section>
      <div class="row-between" style="margin-bottom: 0.85rem">
        <h2 class="section-title" style="margin: 0">Iniciativas recentes</h2>
        <router-link to="/iniciativas" class="btn btn--ghost btn--sm">Ver todas</router-link>
      </div>
      <div class="init-grid">
        <InitiativeCard v-for="item in recentes" :key="item.id" :item="item" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StatCard from '@/components/StatCard.vue'
import InitiativeCard from '@/components/InitiativeCard.vue'
import { formatNumber } from '@/data/partidos'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const auth = useAuthStore()
const data = useDataStore()

const m = computed(() => data.metricas)
const recentes = computed(() => data.iniciativas.slice(0, 4))
</script>

<style scoped lang="scss">
.init-grid {
  display: grid;
  gap: 0;
  grid-template-columns: 1fr;
  border-top: 1px solid var(--pt-line);
  border-left: 1px solid var(--pt-line);

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  :deep(.init-card) {
    border-radius: 0;
    border: none;
    border-right: 1px solid var(--pt-line);
    border-bottom: 1px solid var(--pt-line);
  }
}
</style>
