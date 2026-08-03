<template>
  <router-link :to="to" class="brand" :class="{ 'brand--compact': compact }">
    <span class="brand__mark" aria-hidden="true">
      <span class="brand__flag">
        <span class="brand__flag-green" />
        <span class="brand__flag-gold" />
        <span class="brand__flag-red" />
      </span>
      <span class="brand__letter">V</span>
    </span>
    <span class="brand__text" v-if="!compact">
      <span class="brand__name">A Voto</span>
      <span class="brand__slogan">Bancada Cidadã</span>
    </span>
  </router-link>
</template>

<script setup>
defineProps({
  to: { type: String, default: '/' },
  compact: { type: Boolean, default: false },
})
</script>

<style scoped lang="scss">
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: inherit;
  min-width: 0;

  &--compact .brand__mark {
    width: 34px;
    height: 34px;
  }
}

.brand__mark {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid rgba(12, 27, 51, 0.12);
  background: white;
}

.brand__flag {
  position: absolute;
  inset: 3px;
  display: flex;
  border-radius: 1px;
  overflow: hidden;
}

.brand__flag-green {
  flex: 2;
  background: var(--pt-green);
}

.brand__flag-gold {
  width: 2px;
  background: var(--pt-gold);
  flex-shrink: 0;
}

.brand__flag-red {
  flex: 3;
  background: var(--pt-red);
}

.brand__letter {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.15rem;
  color: white;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
  letter-spacing: -0.02em;
  z-index: 1;
}

.brand__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.05;
}

.brand__name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--pt-navy);
  letter-spacing: -0.02em;
}

.brand__slogan {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pt-red);
  margin-top: 0.12rem;
}
</style>
