<template>
  <div
    v-if="visibleOptions.length > 1"
    class="date-range"
    role="group"
    :aria-label="ariaLabel"
  >
    <div class="date-range__head">
      <span v-if="showLabel" class="date-range__label">{{ label }}</span>
      <span v-if="count != null" class="date-range__count">
        {{ count }} resultado{{ count === 1 ? '' : 's' }}
      </span>
    </div>
    <div class="filter-row date-range__chips">
      <button
        v-for="opt in visibleOptions"
        :key="opt.id"
        type="button"
        class="chip-btn"
        :class="{ 'is-active': model === opt.id }"
        :aria-pressed="model === opt.id"
        @click="select(opt.id)"
      >
        {{ opt.label }}
        <span v-if="opt.id !== 'todos' && opt.count != null" class="chip-btn__n">
          {{ opt.count }}
        </span>
      </button>
    </div>
    <p v-if="hint" class="date-range__hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { DATE_RANGE_OPTIONS, coerceDateRange } from '@/lib/dateRange'

const model = defineModel({ type: String, default: 'todos' })

const props = defineProps({
  label: { type: String, default: 'Quando' },
  showLabel: { type: Boolean, default: true },
  ariaLabel: { type: String, default: 'Filtrar por data' },
  /**
   * Opções já filtradas pela página (optionsForContext).
   * Se omitido, mostra a lista canónica completa.
   */
  options: { type: Array, default: null },
  count: { type: Number, default: null },
  hint: {
    type: String,
    default:
      'Só aparecem períodos com dados nesta lista. “Hoje” exige a data exacta do registo oficial.',
  },
})

const visibleOptions = computed(() => {
  if (Array.isArray(props.options) && props.options.length) return props.options
  return DATE_RANGE_OPTIONS.map((o) => ({ ...o }))
})

function select(id) {
  model.value = id
}

// Se o período activo desapareceu (ex.: sem dados “hoje”), volta a Todas
watch(
  visibleOptions,
  (opts) => {
    model.value = coerceDateRange(model.value, opts)
  },
  { immediate: true },
)
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

.chip-btn__n {
  margin-left: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0.9;
}

.chip-btn.is-active .chip-btn__n {
  opacity: 1;
}
</style>
