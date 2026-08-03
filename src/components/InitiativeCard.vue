<template>
  <router-link :to="`/iniciativas/${item.id}`" class="av-card link-card init-card">
    <div class="flag-stripe" aria-hidden="true">
      <span class="flag-stripe__green" />
      <span class="flag-stripe__red" />
    </div>
    <div class="av-card-pad">
      <div class="init-card__meta">
        <span class="badge" :class="estadoClass">{{ estadosLabel[item.estado] }}</span>
        <span class="badge badge--navy">{{ item.tipo }}</span>
        <span class="badge badge--muted">{{ item.tema }}</span>
      </div>
      <h3 class="link-card__title init-card__title">{{ item.titulo }}</h3>
      <p class="init-card__id">{{ item.idOficial }} · Legislatura {{ item.legislatura }}</p>

      <div v-if="partyRows.length" class="init-card__parties">
        <span
          v-for="row in partyRows"
          :key="row.id"
          class="pv"
          :class="`pv--${row.voto}`"
          :title="row.nome"
        >
          <i class="pv__dot" :style="{ background: row.cor }" />
          {{ row.sigla }}
        </span>
      </div>
      <p v-else class="init-card__no-party">Sem votos de partidos na AR neste registo</p>

      <VoteBar :votos="item.votosCidadaos" :show-counts="false" />
      <div class="init-card__footer">
        <span v-if="item.dataVotacao">Votação AR: {{ formatDate(item.dataVotacao) }}</span>
        <span v-else>Ainda sem votação na AR</span>
        <span class="init-card__more">Ver detalhe →</span>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import VoteBar from './VoteBar.vue'
import { estadosLabel, formatDate, partidos } from '@/data/partidos'

const props = defineProps({
  item: { type: Object, required: true },
})

const estadoClass = computed(() => {
  const map = {
    aprovado: 'badge--green',
    rejeitado: 'badge--red',
    em_discussao: 'badge--gold',
    arquivado: 'badge--muted',
  }
  return map[props.item.estado] || 'badge--muted'
})

/** Mini lista de partidos com voto AR */
const partyRows = computed(() => {
  const map = props.item.resultadoPartidos || {}
  return partidos
    .filter((p) => map[p.id] && map[p.id] !== 'nao_participou')
    .map((p) => ({
      id: p.id,
      sigla: p.sigla,
      nome: p.nome,
      cor: p.cor,
      voto: map[p.id],
    }))
})
</script>

<style scoped lang="scss">
.init-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.7rem;
}

.init-card {
  transition: background 0.12s ease;

  &:hover {
    background: #faf8f3;
  }
}

.init-card__title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--pt-navy);
  margin: 0 0 0.35rem;
}

.init-card__id {
  font-size: 0.85rem;
  color: var(--pt-muted);
  margin: 0 0 0.55rem;
  font-family: var(--font-mono);
}
.init-card__parties {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin: 0 0 0.75rem;
}
.pv {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--pt-border);
  color: var(--pt-navy);
  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  &--favor {
    background: rgba(4, 106, 56, 0.08);
    border-color: rgba(4, 106, 56, 0.25);
  }
  &--contra {
    background: rgba(200, 16, 46, 0.08);
    border-color: rgba(200, 16, 46, 0.25);
  }
  &--abstencao {
    background: rgba(0, 0, 0, 0.04);
  }
}
.init-card__no-party {
  margin: 0 0 0.65rem;
  font-size: 0.8rem;
  color: var(--pt-muted);
  font-style: italic;
}

.init-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.85rem;
  font-size: 0.85rem;
  color: var(--pt-muted);
  flex-wrap: wrap;
}

.init-card__more {
  font-weight: 700;
  color: var(--pt-green-dark);
}
</style>
