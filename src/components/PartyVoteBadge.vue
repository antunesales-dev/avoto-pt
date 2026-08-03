<template>
  <span class="pvb" :class="`pvb--${voto}`">
    <span class="party-dot" :style="{ background: partido?.cor || '#999' }" />
    <span class="pvb__sigla">{{ partido?.sigla || '—' }}</span>
    <span class="pvb__voto">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { votoLabel } from '@/data/mock'

const props = defineProps({
  partido: Object,
  voto: String,
})

const label = computed(() => votoLabel[props.voto] || props.voto)
</script>

<style scoped lang="scss">
.pvb {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  border: 1px solid var(--pt-border);
  background: #fafaf9;

  &__sigla {
    color: var(--pt-navy);
    min-width: 3.2rem;
  }

  &__voto {
    color: var(--pt-muted);
  }

  &--favor {
    border-color: rgba(4, 106, 56, 0.25);
    background: rgba(4, 106, 56, 0.06);
    .pvb__voto {
      color: var(--pt-green-dark);
    }
  }

  &--contra {
    border-color: rgba(218, 41, 28, 0.25);
    background: rgba(218, 41, 28, 0.06);
    .pvb__voto {
      color: var(--pt-red-dark);
    }
  }

  &--abstencao {
    border-color: #d6d3d1;
    background: #f5f5f4;
  }

  &--nao_participou {
    opacity: 0.7;
  }
}
</style>
