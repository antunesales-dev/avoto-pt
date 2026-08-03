<template>
  <div class="not-found">
    <div class="flag-stripe" aria-hidden="true">
      <span class="flag-stripe__green" />
      <span class="flag-stripe__red" />
    </div>
    <div class="not-found__body">
      <p class="code font-display">404</p>
      <h1 class="page-title">Página não encontrada</h1>
      <p class="page-subtitle">
        Este endereço não existe na A Voto. Volte ao início ou explore as iniciativas.
      </p>
      <div class="actions">
        <router-link to="/" class="btn btn--primary">Ir para o início</router-link>
        <router-link to="/iniciativas" class="btn btn--outline">Iniciativas</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.not-found {
  min-height: 100vh;
  background: var(--pt-cream);
  display: flex;
  flex-direction: column;
}

.not-found__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  max-width: 36rem;
  margin: 0 auto;
  padding: 2rem 1.25rem;
}

.code {
  font-size: 4rem;
  font-weight: 700;
  margin: 0;
  line-height: 1;
  background: linear-gradient(90deg, var(--pt-green), var(--pt-red));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}
</style>
