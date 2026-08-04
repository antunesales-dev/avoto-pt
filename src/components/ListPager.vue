<template>
  <div class="list-pager">
    <div class="list-pager__bar">
      <p class="list-pager__count">
        <template v-if="total">
          A mostrar <strong>{{ rangeFrom }}–{{ rangeTo }}</strong> de
          <strong>{{ total }}</strong>
          <template v-if="unit"> {{ unit }}</template>
          · página {{ page }} / {{ totalPages }}
        </template>
        <template v-else>Sem resultados</template>
      </p>
      <label v-if="showSize" class="list-pager__size">
        Por página
        <select :value="pageSize" aria-label="Resultados por página" @change="onSize">
          <option v-for="s in sizes" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
    </div>

    <nav v-if="totalPages > 1" class="list-pager__nav" :aria-label="ariaLabel">
      <button type="button" class="btn btn--outline btn--sm" :disabled="page <= 1" @click="$emit('go', 1)">
        «
      </button>
      <button
        type="button"
        class="btn btn--outline btn--sm"
        :disabled="page <= 1"
        @click="$emit('go', page - 1)"
      >
        Anterior
      </button>
      <button
        v-for="(p, idx) in pageWindow"
        :key="`${p}-${idx}`"
        type="button"
        class="list-pager__num"
        :class="{ 'is-active': p === page, 'is-ellipsis': p === '…' }"
        :disabled="p === '…'"
        @click="p !== '…' && $emit('go', p)"
      >
        {{ p }}
      </button>
      <button
        type="button"
        class="btn btn--outline btn--sm"
        :disabled="page >= totalPages"
        @click="$emit('go', page + 1)"
      >
        Seguinte
      </button>
      <button
        type="button"
        class="btn btn--outline btn--sm"
        :disabled="page >= totalPages"
        @click="$emit('go', totalPages)"
      >
        »
      </button>
    </nav>
  </div>
</template>

<script setup>
const props = defineProps({
  page: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  total: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  rangeFrom: { type: Number, required: true },
  rangeTo: { type: Number, required: true },
  pageWindow: { type: Array, required: true },
  sizes: { type: Array, default: () => [12, 24, 48] },
  unit: { type: String, default: '' },
  showSize: { type: Boolean, default: true },
  ariaLabel: { type: String, default: 'Paginação' },
})

const emit = defineEmits(['go', 'update:pageSize'])

function onSize(e) {
  emit('update:pageSize', Number(e.target.value))
}
</script>

<style scoped lang="scss">
.list-pager__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
  margin: 0 0 0.85rem;
}
.list-pager__count {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--pt-muted);
  margin: 0;
}
.list-pager__size {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--pt-muted);
  select {
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.3rem 0.45rem;
    border: 1px solid var(--pt-border);
    border-radius: 6px;
    background: var(--pt-cream);
    color: var(--pt-navy);
  }
}
.list-pager__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 1.25rem 0 0.35rem;
}
.list-pager__num {
  min-width: 2.25rem;
  height: 2.25rem;
  padding: 0 0.45rem;
  border: 1.5px solid var(--pt-border);
  border-radius: 6px;
  background: #fff;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--pt-navy);
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: var(--pt-green);
  }
  &.is-active {
    background: var(--pt-green);
    border-color: var(--pt-green);
    color: #fff;
  }
  &.is-ellipsis {
    border: none;
    background: transparent;
    cursor: default;
    min-width: 1.25rem;
  }
  &:disabled:not(.is-ellipsis) {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
