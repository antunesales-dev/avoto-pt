<template>
  <div class="page-shell stack-lg">
    <section class="hero">
      <div class="hero__eyebrow">
        <span class="party-dot" style="background: var(--pt-green)" />
        Independente · Open source · Cidadania
      </div>
      <h1 class="hero__title">A Voto — Bancada Cidadã</h1>
      <p class="hero__lead">
        Plataforma cívica independente (não governamental), neutra e open source: vê, lado a lado,
        o que os cidadãos registados votam e o que cada partido votou no Parlamento. Sem
        recomendações. Sem enviesamento. Só factos.
      </p>
      <div class="hero__actions">
        <router-link to="/iniciativas" class="btn btn--primary">Ver iniciativas</router-link>
        <router-link to="/como-funciona" class="btn btn--outline">Como funciona</router-link>
        <router-link to="/comparacao" class="btn btn--ghost">Comparação global</router-link>
      </div>
    </section>

    <section>
      <h2 class="section-title">Números da plataforma</h2>
      <div class="stats-grid">
        <StatCard
          label="Cidadãos registados"
          :value="formatNumber(metricasGlobais.cidadaosRegistados)"
          hint="IDs únicos activos (demo)"
          icon="groups"
          accent="var(--pt-green)"
          tint="rgba(4, 106, 56, 0.1)"
        />
        <StatCard
          label="Votos emitidos"
          :value="formatNumber(metricasGlobais.votosEmitidos)"
          hint="Total de votos de cidadãos"
          icon="how_to_vote"
          accent="var(--pt-red)"
          tint="rgba(218, 41, 28, 0.1)"
        />
        <StatCard
          label="Iniciativas"
          :value="formatNumber(metricasGlobais.iniciativasDisponiveis)"
          :hint="`Legislatura ${metricasGlobais.legislatura}`"
          icon="gavel"
          accent="var(--pt-navy)"
          tint="rgba(0, 32, 91, 0.08)"
        />
        <StatCard
          label="Participação média"
          :value="metricasGlobais.taxaParticipacaoMedia + '%'"
          hint="Votos / registados por item"
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

    <section class="av-card">
      <div class="av-card-pad principles">
        <h2 class="section-title">Princípios</h2>
        <div class="principles__grid">
          <div v-for="p in principios" :key="p.t" class="principle">
            <div class="principle__icon">
              <q-icon :name="p.icon" size="22px" />
            </div>
            <h3>{{ p.t }}</h3>
            <p>{{ p.d }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="notice">
      <strong>Demonstração.</strong>
      Há login e voto (sessão demo em memória). Para votar: Entrar → escolher iniciativa →
      confirmar. O voto não pode ser alterado. Dados parlamentares e contagens base são simulados;
      em produção: Supabase Auth + Dados Abertos da AR.
    </section>
  </div>
</template>

<script setup>
import StatCard from '@/components/StatCard.vue'
import InitiativeCard from '@/components/InitiativeCard.vue'
import { iniciativas, metricasGlobais, formatNumber } from '@/data/mock'

const recentes = [...iniciativas].slice(0, 4)

const principios = [
  {
    t: 'Open source total',
    d: 'Código, queries e cálculos auditáveis por qualquer pessoa.',
    icon: 'code',
  },
  {
    t: 'Só fontes oficiais',
    d: 'Dados parlamentares dos Dados Abertos da AR — como fonte, não como “selo” do Estado. Nunca notícias ou wikis.',
    icon: 'link',
  },
  {
    t: 'Neutro e factual',
    d: 'Sem rankings de partidos, sem recomendações, sem linguagem política.',
    icon: 'balance',
  },
  {
    t: 'Um voto por cidadão',
    d: 'ID único por pessoa. Voto associado ao ID, não ao nome público.',
    icon: 'fingerprint',
  },
]
</script>

<style scoped lang="scss">
.init-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.principles__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.principle {
  padding: 0.5rem 0.25rem;

  h3 {
    font-family: var(--font-display);
    font-size: 1.15rem;
    margin: 0.55rem 0 0.35rem;
    color: var(--pt-navy);
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--pt-muted);
    line-height: 1.45;
  }
}

.principle__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(4, 106, 56, 0.12), rgba(218, 41, 28, 0.08));
  color: var(--pt-navy);
}
</style>
