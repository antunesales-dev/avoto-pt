<template>
  <div class="av-card stat">
    <div class="av-card-pad">
      <div class="stat__icon" :style="{ background: tint }">
        <q-icon :name="icon" size="22px" :style="{ color: accent }" />
      </div>
      <div class="stat__label">{{ label }}</div>
      <div class="stat__value font-display">{{ value }}</div>
      <div v-if="hint" class="stat__hint">{{ hint }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  value: [String, Number],
  hint: String,
  icon: { type: String, default: 'insights' },
  accent: { type: String, default: 'var(--pt-green)' },
  tint: { type: String, default: 'rgba(4, 106, 56, 0.1)' },
})
</script>

<style scoped lang="scss">
.stat__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.stat__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--pt-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat__value {
  font-size: 1.85rem;
  font-weight: 700;
  color: var(--pt-navy);
  line-height: 1.15;
  margin-top: 0.2rem;
}

.stat__hint {
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: var(--pt-muted);
}
</style>
