<template>
  <div class="page-shell auth-page">
    <h1 class="page-title">Criar conta</h1>
    <p class="page-subtitle">
      Recebe um ID de cidadão único (ex.: CID-…). Sem NIF nem Cartão de Cidadão. O email serve só
      para conta e recuperação.
    </p>

    <form class="av-card av-card-pad auth-form" @submit.prevent="onSubmit">
      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label class="field">
        <span>Palavra-passe</span>
        <input v-model="password" type="password" autocomplete="new-password" required minlength="8" />
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
      <p v-if="info" class="form-info">{{ info }}</p>

      <button type="submit" class="btn btn--primary" :disabled="auth.loading">
        {{ auth.loading ? 'A criar…' : 'Criar conta' }}
      </button>

      <p class="auth-switch">
        Já tem conta?
        <router-link to="/entrar">Entrar</router-link>
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import '@/css/auth.scss'

const auth = useAuthStore()
const router = useRouter()
const $q = useQuasar()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const partido = ref('')
const formError = ref('')
const info = ref('')

async function onSubmit() {
  formError.value = ''
  info.value = ''
  try {
    const result = await auth.registar({
      email: email.value,
      password: password.value,
      passwordConfirm: passwordConfirm.value,
      partidoPreferencia: partido.value,
    })
    if (result.needsEmailConfirmation) {
      router.replace({
        name: 'confirmar-email',
        query: { email: email.value },
      })
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
