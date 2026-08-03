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

    <section class="recent-section">
      <div class="row-between recent-section__head">
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
.stack-lg {
  gap: 1.5rem;
}

.recent-section__head {
  margin-bottom: 0.65rem;
  gap: 0.75rem;
  align-items: center;
}

/* Grelha colada — sem “buracos” de margem entre cards */
.init-grid {
  display: grid;
  gap: 0;
  grid-template-columns: 1fr;
  border: 1px solid var(--pt-line);
  background: var(--pt-white);

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  :deep(.init-card) {
    border: none;
    border-radius: 0;
    height: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--pt-white);
    border-bottom: 1px solid var(--pt-line);

    @media (min-width: 768px) {
      border-right: 1px solid var(--pt-line);

      &:nth-child(2n) {
        border-right: none;
      }

      &:nth-last-child(-n + 2) {
        border-bottom: none;
      }
    }

    @media (max-width: 767px) {
      &:last-child {
        border-bottom: none;
      }
    }
  }

  /* Uma só linha de cor no topo da grelha; cards internos sem stripe extra */
  :deep(.flag-stripe) {
    display: none;
  }

  :deep(.av-card-pad) {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem 1.05rem 1.05rem;
  }

  :deep(.init-card__footer) {
    margin-top: auto;
    padding-top: 0.75rem;
  }
}
</style>
