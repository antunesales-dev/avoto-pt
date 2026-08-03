<template>
  <div class="page-shell auth-page">
    <h1 class="page-title">Criar conta</h1>
    <p class="page-subtitle">
      O caminho mais simples e seguro: <strong>sem palavra-passe</strong>. Use o email na página
      Entrar — enviamos um link e um código. A conta e o ID de cidadão (CID-…) criam-se no primeiro
      acesso.
    </p>

    <div class="av-card av-card-pad stack">
      <div class="notice notice-info">
        Recomendado: magic link / código. Evita passwords reutilizadas e recuperação complicada.
      </div>
      <router-link class="btn btn--primary" :to="{ name: 'entrar', query: route.query }">
        Continuar com email (sem password)
      </router-link>

      <button type="button" class="btn btn--ghost btn--sm" @click="showLegacy = !showLegacy">
        {{ showLegacy ? 'Esconder' : 'Criar conta com palavra-passe (opcional)' }}
      </button>

      <form v-if="showLegacy" class="auth-form" @submit.prevent="onSubmit">
        <label class="field">
          <span>Email</span>
          <input v-model="email" type="email" autocomplete="email" required />
        </label>
        <label class="field">
          <span>Palavra-passe</span>
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            required
            minlength="8"
          />
        </label>
        <label class="field">
          <span>Confirmar palavra-passe</span>
          <input
            v-model="passwordConfirm"
            type="password"
            autocomplete="new-password"
            required
            minlength="8"
          />
        </label>
        <label class="field">
          <span>Partido com que me identifico (opcional)</span>
          <input v-model="partido" type="text" maxlength="80" placeholder="Pode ficar em branco" />
        </label>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <button type="submit" class="btn btn--outline" :disabled="auth.loading">
          {{ auth.loading ? 'A criar…' : 'Criar com palavra-passe' }}
        </button>
      </form>

      <p class="auth-switch">
        Já tem conta?
        <router-link to="/entrar">Entrar</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import '@/css/auth.scss'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()

const showLegacy = ref(false)
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const partido = ref('')
const formError = ref('')

async function onSubmit() {
  formError.value = ''
  try {
    const result = await auth.registar({
      email: email.value,
      password: password.value,
      passwordConfirm: passwordConfirm.value,
      partidoPreferencia: partido.value,
    })
    if (result.needsEmailConfirmation) {
      router.replace({ name: 'confirmar-email', query: { email: email.value } })
      return
    }
    $q.notify({
      type: 'positive',
      message: `Conta criada. O seu ID: ${auth.cid || 'a carregar…'}`,
      position: 'top',
    })
    router.replace('/perfil')
  } catch (e) {
    formError.value = e.message || 'Não foi possível criar a conta.'
  }
}
</script>
