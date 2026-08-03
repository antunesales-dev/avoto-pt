<template>
  <div class="page-shell auth-page">
    <h1 class="page-title">Recuperar palavra-passe</h1>
    <p class="page-subtitle">
      Indique o email da conta. Se existir, enviamos um link para definir uma nova palavra-passe.
    </p>

    <form v-if="!sent" class="av-card av-card-pad auth-form" @submit.prevent="onSubmit">
      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <button type="submit" class="btn btn--primary" :disabled="auth.loading">
        {{ auth.loading ? 'A enviar…' : 'Enviar link' }}
      </button>
      <p class="auth-switch">
        <router-link to="/entrar">Voltar a entrar</router-link>
      </p>
    </form>

    <div v-else class="av-card av-card-pad">
      <p class="form-info" style="margin-bottom: 1rem">
        Se existir uma conta com <strong>{{ email }}</strong>, receberá um email com um link.
        O link abre a página para definir a nova palavra-passe.
      </p>
      <router-link to="/entrar" class="btn btn--outline btn--sm">Ir para entrar</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import '@/css/auth.scss'

const auth = useAuthStore()
const email = ref('')
const formError = ref('')
const sent = ref(false)

async function onSubmit() {
  formError.value = ''
  try {
    await auth.pedirRecuperacao(email.value)
    sent.value = true
  } catch (e) {
    formError.value = e.message || 'Não foi possível enviar o email.'
  }
}
</script>
