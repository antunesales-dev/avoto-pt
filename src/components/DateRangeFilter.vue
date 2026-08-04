<template>
  <div class="date-range" role="group" :aria-label="ariaLabel">
    <span v-if="showLabel" class="date-range__label">{{ label }}</span>
    <div class="filter-row date-range__chips">
      <button
        v-for="opt in options"
        :key="opt.id"
        type="button"
        class="chip-btn"
        :class="{ 'is-active': modelValue === opt.id }"
        :aria-pressed="modelValue === opt.id"
        @click="$emit('update:modelValue', opt.id)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { DATE_RANGE_OPTIONS } from '@/lib/dateRange'

defineProps({
  modelValue: { type: String, default: 'todos' },
  label: { type: String, default: 'Quando' },
  showLabel: { type: Boolean, default: true },
  ariaLabel: { type: String, default: 'Filtrar por data' },
  options: { type: Array, default: () => DATE_RANGE_OPTIONS },
})

defineEmits(['update:modelValue'])
</script>

<style scoped lang="scss">
.date-range {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
}

.date-range__label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pt-muted);
}

.date-range__chips {
  margin: 0;
}
</style>
