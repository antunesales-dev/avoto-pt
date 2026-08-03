<template>
  <div class="vote-bar">
    <div class="vote-bar__legend">
      <span><i class="dot favor" /> A favor {{ pct.favor }}%</span>
      <span><i class="dot contra" /> Contra {{ pct.contra }}%</span>
      <span><i class="dot abst" /> Abstenção {{ pct.abstencao }}%</span>
    </div>
    <div class="vote-track" role="img" :aria-label="ariaLabel">
      <div class="vote-seg vote-seg--favor" :style="{ width: pct.favor + '%' }" />
      <div class="vote-seg vote-seg--contra" :style="{ width: pct.contra + '%' }" />
      <div class="vote-seg vote-seg--abstencao" :style="{ width: pct.abstencao + '%' }" />
    </div>
    <div v-if="showCounts" class="vote-bar__counts">
      <span>{{ formatNumber(votos.favor) }} a favor</span>
      <span>{{ formatNumber(votos.contra) }} contra</span>
      <span>{{ formatNumber(votos.abstencao) }} abstenções</span>
      <span class="total">{{ formatNumber(total) }} votos</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { percentagens, totalVotos, formatNumber } from '@/data/partidos'

const props = defineProps({
  votos: {
    type: Object,
    required: true,
  },
  showCounts: { type: Boolean, default: true },
})

const pct = computed(() => percentagens(props.votos))
const total = computed(() => totalVotos(props.votos))
const ariaLabel = computed(
  () =>
    `Votos dos cidadãos: ${pct.value.favor}% a favor, ${pct.value.contra}% contra, ${pct.value.abstencao}% abstenção`,
)
</script>

<style scoped lang="scss">
.vote-bar__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--pt-muted);
  margin-bottom: 0.45rem;

  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 0.3rem;

    &.favor {
      background: var(--pt-green);
    }
    &.contra {
      background: var(--pt-red);
    }
    &.abst {
      background: #a8a29e;
    }
  }
}

.vote-bar__counts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--pt-muted);

  .total {
    margin-left: auto;
    font-weight: 700;
    color: var(--pt-navy);
  }
}
</style>
