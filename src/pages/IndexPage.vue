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
        <router-link to="/iniciativas" class="btn btn--primary">Iniciativas</router-link>
        <router-link to="/digest" class="btn btn--outline">Resumo do dia</router-link>
        <router-link to="/despesa" class="btn btn--outline">Despesa</router-link>
        <router-link to="/investimentos" class="btn btn--outline">Investimentos</router-link>
        <router-link v-if="!auth.isLoggedIn" to="/registo" class="btn btn--ghost">Criar conta</router-link>
      </div>
    </section>

    <section>
      <h2 class="section-title">Dados oficiais na plataforma</h2>
      <p class="section-hint">
        Conteúdo de fontes oficiais. Investimentos = contratos grandes (≥100&nbsp;000&nbsp;€)
        onde se pode votar; Despesa = catálogo completo (só consulta); Resumos = boletim
        por <strong>data oficial</strong> (não por data de sync). Origem e últimas
        importações:
        <router-link to="/dados">Fontes de dados</router-link>.
      </p>
      <div class="stats-grid">
        <StatCard
          label="Iniciativas (AR)"
          :value="formatNumber(m.iniciativas_disponiveis)"
          icon="gavel"
        />
        <StatCard
          label="Resumos do dia"
          :value="formatNumber(m.digests)"
          icon="today"
          accent="var(--pt-navy)"
          tint="rgba(0, 32, 91, 0.08)"
        />
        <StatCard
          label="Despesas / contratos"
          :value="formatNumber(m.despesas)"
          icon="account_balance"
          accent="var(--pt-red)"
          tint="rgba(218, 41, 28, 0.1)"
        />
        <StatCard
          label="Investimentos"
          :value="formatNumber(m.investimentos)"
          icon="savings"
          accent="#7a5f00"
          tint="rgba(241, 191, 0, 0.18)"
        />
      </div>

      <div class="part-box av-card av-card-pad">
        <h3 class="part-box__title">Participação cidadã</h3>
        <template v-if="m.votos_emitidos > 0">
          <p class="part-box__nums">
            <strong>{{ formatNumber(m.votos_emitidos) }}</strong> voto(s) ·
            <strong>{{ formatNumber(m.cidadaos_registados) }}</strong> conta(s)
            <template v-if="m.taxa_participacao_media > 0">
              · taxa média {{ m.taxa_participacao_media }}%
            </template>
          </p>
        </template>
        <template v-else>
          <p class="part-box__empty">
            Ainda <strong>não há votos nem contas de cidadãos</strong> com participação. Os
            números de iniciativas e despesa vêm dos portais oficiais; a comparação com a
            vontade dos registados começa quando alguém entra e vota.
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
        </template>
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
const recentes = computed(() => {
  const withParties = data.iniciativas.filter(
    (i) => i.resultadoPartidos && Object.keys(i.resultadoPartidos).length > 0,
  )
  const list = withParties.length ? withParties : data.iniciativas
  return list.slice(0, 4)
})
</script>

<style scoped lang="scss">
.stack-lg {
  gap: 1.5rem;
}

.section-hint {
  margin: -0.35rem 0 0.85rem;
  font-size: 0.9rem;
  color: var(--pt-muted);
}

.part-box {
  margin-top: 1rem;
}
.part-box__title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--pt-navy);
}
.part-box__nums {
  margin: 0;
  font-size: 0.95rem;
  color: var(--pt-ink);
}
.part-box__empty {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--pt-muted);
}

.recent-section__head {
  margin-bottom: 0.85rem;
  gap: 0.75rem;
  align-items: center;
}

.init-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;

  @media (min-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
