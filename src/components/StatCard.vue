<template>
  <div class="stat">
    <div class="stat__label">{{ label }}</div>
    <div class="stat__value font-display">{{ value }}</div>
    <div v-if="hint" class="stat__hint">{{ hint }}</div>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  value: [String, Number],
  hint: String,
  // kept for API compatibility — icons removed for less “dashboard AI”
  icon: { type: String, default: '' },
  accent: { type: String, default: '' },
  tint: { type: String, default: '' },
})
</script>

<style scoped lang="scss">
.stat {
  padding: 1rem 1.1rem 1.15rem;
  background: var(--pt-white);
  min-height: 100%;
}

.stat__label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--pt-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat__value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--pt-navy);
  line-height: 1.15;
  margin-top: 0.35rem;
  font-variant-numeric: tabular-nums;
}

.stat__hint {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--pt-muted);
}
</style>
