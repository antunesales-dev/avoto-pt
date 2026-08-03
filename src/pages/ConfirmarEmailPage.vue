<template>
  <div class="page-shell auth-page">
    <h1 class="page-title">Confirme o email</h1>
    <p class="page-subtitle">
      Enviámos um link de confirmação
      <template v-if="email"> para <strong>{{ email }}</strong></template
      >. Abra o email e clique no link para activar a conta.
    </p>

    <div class="av-card av-card-pad stack">
      <div class="notice notice-info">
        Sem confirmação não consegue entrar nem votar. Verifique também a pasta de spam.
      </div>

      <label class="field">
        <span>Email (para reenviar)</span>
        <input v-model="emailLocal" type="email" autocomplete="email" />
      </label>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <p v-if="info" class="form-info">{{ info }}</p>

      <button type="button" class="btn btn--primary" :disabled="auth.loading" @click="onResend">
        {{ auth.loading ? 'A reenviar…' : 'Reenviar email de confirmação' }}
      </button>

      <p class="auth-switch">
        Já confirmou?
        <router-link to="/entrar">Entrar</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import '@/css/auth.scss'

const auth = useAuthStore()
const route = useRoute()

const email = typeof route.query.email === 'string' ? route.query.email : ''
const emailLocal = ref(email)
const formError = ref('')
const info = ref('')

async function onResend() {
  formError.value = ''
  info.value = ''
  try {
    await auth.reenviarConfirmacao(emailLocal.value)
    info.value = 'Email reenviado (se a conta existir e ainda não estiver confirmada).'
  } catch (e) {
    formError.value = e.message || 'Não foi possível reenviar.'
  }
}
</script>
