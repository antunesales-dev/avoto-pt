<template>
  <span class="pvb" :class="`pvb--${voto || 'nao_participou'}`" :title="title">
    <span class="party-dot" :style="{ background: partido?.cor || '#999' }" aria-hidden="true" />
    <span class="pvb__sigla">{{ partido?.sigla || '—' }}</span>
    <span v-if="assentos > 0" class="pvb__seats">{{ assentos }}</span>
    <span class="pvb__voto">
      <span class="pvb__mark" aria-hidden="true">{{ mark }}</span>
      {{ label }}
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { votoLabel } from '@/data/partidos'

const props = defineProps({
  partido: Object,
  voto: String,
  /** Deputados da bancada (peso no hemiciclo); 0 = não mostrar */
  assentos: { type: Number, default: 0 },
})

const label = computed(() => votoLabel[props.voto] || props.voto || '—')

const mark = computed(() => {
  if (props.voto === 'favor') return '✓'
  if (props.voto === 'contra') return '✕'
  if (props.voto === 'abstencao') return '−'
  return '·'
})

const title = computed(() => {
  const s = props.partido?.sigla || props.partido?.nome || 'Partido'
  const seats =
    props.assentos > 0 ? ` · ${props.assentos} deputado${props.assentos === 1 ? '' : 's'}` : ''
  return `${s}: ${label.value}${seats}`
})
</script>

<style scoped lang="scss">
.pvb {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.55rem 0.4rem 0.55rem;
  border-radius: 2px;
  font-size: 0.84rem;
  font-weight: 600;
  border: 1.5px solid var(--pt-border);
  border-left-width: 4px;
  background: var(--pt-cream);
  line-height: 1.2;

  .party-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
  }

  &__sigla {
    color: var(--pt-navy);
    font-weight: 800;
    min-width: 2.6rem;
    letter-spacing: 0.02em;
  }

  &__seats {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--pt-muted);
    min-width: 1.4rem;
  }

  &__voto {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
    font-weight: 800;
    font-size: 0.78rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    padding: 0.18rem 0.45rem;
    border-radius: 2px;
    border: 1px solid transparent;
  }

  &__mark {
    font-size: 0.85rem;
    font-weight: 900;
    line-height: 1;
  }

  /* A favor — verde forte */
  &--favor {
    border-color: #7abf96;
    border-left-color: var(--pt-green);
    background: #e8f5ee;

    .pvb__voto {
      color: #fff;
      background: var(--pt-green);
      border-color: var(--pt-green-dark);
    }
  }

  /* Contra — vermelho forte */
  &--contra {
    border-color: #e8a0a8;
    border-left-color: var(--pt-red);
    background: #fdeceb;

    .pvb__voto {
      color: #fff;
      background: var(--pt-red);
      border-color: var(--pt-red-dark);
    }
  }

  /* Abstenção — âmbar / ouro (não cinza “apagado”) */
  &--abstencao {
    border-color: #e0c86a;
    border-left-color: #b8860b;
    background: #fbf3d5;

    .pvb__voto {
      color: #3d3200;
      background: var(--pt-gold);
      border-color: #b8860b;
    }
  }

  &--nao_participou {
    opacity: 0.72;
    border-left-color: var(--pt-muted);

    .pvb__voto {
      color: var(--pt-muted);
      background: #eceae6;
      border-color: var(--pt-line);
      font-weight: 700;
    }
  }
}
</style>
