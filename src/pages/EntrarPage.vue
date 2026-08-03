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

      <div class="auth-links">
        <router-link to="/recuperar-password">Esqueci a palavra-passe</router-link>
        <router-link to="/confirmar-email">Reenviar confirmação</router-link>
      </div>

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
import '@/css/auth.scss'

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
    const msg = e.message || 'Não foi possível entrar.'
    if (/confirm|verif|email/i.test(msg)) {
      formError.value =
        'Confirme o email antes de entrar. Use «Reenviar confirmação» se não recebeu o link.'
    } else {
      formError.value = msg
    }
  }
}
</script>
