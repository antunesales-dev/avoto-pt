<template>
  <div class="date-range" role="group" :aria-label="ariaLabel">
    <div class="date-range__head">
      <span v-if="showLabel" class="date-range__label">{{ label }}</span>
      <span v-if="count != null" class="date-range__count">
        {{ count }} resultado{{ count === 1 ? '' : 's' }}
      </span>
    </div>
    <div class="filter-row date-range__chips">
      <button
        v-for="opt in options"
        :key="opt.id"
        type="button"
        class="chip-btn"
        :class="{ 'is-active': model === opt.id }"
        :aria-pressed="model === opt.id"
        @click="select(opt.id)"
      >
        {{ opt.label }}
      </button>
    </div>
    <p v-if="hint" class="date-range__hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { DATE_RANGE_OPTIONS } from '@/lib/dateRange'

const model = defineModel({ type: String, default: 'todos' })

defineProps({
  label: { type: String, default: 'Quando' },
  showLabel: { type: Boolean, default: true },
  ariaLabel: { type: String, default: 'Filtrar por data' },
  options: { type: Array, default: () => DATE_RANGE_OPTIONS },
  /** Nº de itens após filtro (opcional, feedback visual) */
  count: { type: Number, default: null },
  hint: {
    type: String,
    default:
      'Usa a data do registo oficial. “Hoje” só mostra o que tem essa data exacta — se a lista ficar vazia, experimente “Últimos 30 dias”.',
  },
})

function select(id) {
  model.value = id
}
</script>

<style scoped lang="scss">
.date-range {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
}

.date-range__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem 0.75rem;
}

.date-range__label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pt-muted);
}

.date-range__count {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--pt-navy);
  font-family: var(--font-mono);
}

.date-range__chips {
  margin: 0;
}

.date-range__hint {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--pt-muted);
  line-height: 1.4;
  max-width: 42rem;
}
</style>
