<template>
  <div class="page-shell auth-page">
    <h1 class="page-title">Entrar</h1>
    <p class="page-subtitle">
      Conta obrigatória para votar. Um ID de cidadão por pessoa; um voto por iniciativa.
    </p>

    <form class="av-card av-card-pad auth-form" @submit.prevent="onSubmit">
      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="username" required />
      </label>
      <label class="field">
        <span>Palavra-passe</span>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <button type="submit" class="btn btn--primary" :disabled="auth.loading">
        {{ auth.loading ? 'A entrar…' : 'Entrar' }}
      </button>

      <p class="auth-switch">
        Ainda não tem conta?
        <router-link to="/registo">Criar conta</router-link>
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const formError = ref('')

async function onSubmit() {
  formError.value = ''
  try {
    await auth.entrar({ email: email.value, password: password.value })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/perfil'
    router.replace(redirect)
  } catch (e) {
    formError.value = e.message || 'Não foi possível entrar.'
  }
}
</script>

<style scoped lang="scss">
.auth-page {
  max-width: 28rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--pt-navy);

  input {
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 500;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--pt-border);
    border-radius: 10px;
    background: var(--pt-cream);
    color: var(--pt-ink);

    &:focus {
      outline: 2px solid rgba(4, 106, 56, 0.35);
      border-color: var(--pt-green);
    }
  }
}

.form-error {
  margin: 0;
  color: var(--pt-red-dark);
  font-size: 0.9rem;
  font-weight: 600;
}

.auth-switch {
  margin: 0;
  font-size: 0.9rem;
  color: var(--pt-muted);

  a {
    font-weight: 700;
  }
}
</style>
