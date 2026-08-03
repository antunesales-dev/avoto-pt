<template>
  <div class="page-shell auth-page">
    <h1 class="page-title">Nova palavra-passe</h1>
    <p class="page-subtitle">
      Defina a nova palavra-passe da conta. Use o link enviado por email; se chegou aqui sem link,
      peça uma nova recuperação.
    </p>

    <form class="av-card av-card-pad auth-form" @submit.prevent="onSubmit">
      <label class="field">
        <span>Nova palavra-passe</span>
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          required
          minlength="8"
        />
      </label>
      <label class="field">
        <span>Confirmar</span>
        <input
          v-model="passwordConfirm"
          type="password"
          autocomplete="new-password"
          required
          minlength="8"
        />
      </label>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <p v-if="ok" class="form-info">Palavra-passe actualizada. Já pode usar a conta.</p>
      <button type="submit" class="btn btn--primary" :disabled="auth.loading || ok">
        {{ auth.loading ? 'A guardar…' : 'Guardar palavra-passe' }}
      </button>
      <p class="auth-switch">
        <router-link to="/entrar">Entrar</router-link>
        ·
        <router-link to="/recuperar-password">Pedir novo link</router-link>
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

const password = ref('')
const passwordConfirm = ref('')
const formError = ref('')
const ok = ref(false)

async function onSubmit() {
  formError.value = ''
  try {
    await auth.atualizarPassword(password.value, passwordConfirm.value)
    ok.value = true
    $q.notify({
      type: 'positive',
      message: 'Palavra-passe actualizada.',
      position: 'top',
    })
    setTimeout(() => router.replace('/perfil'), 800)
  } catch (e) {
    formError.value = e.message || 'Não foi possível actualizar.'
  }
}
</script>
