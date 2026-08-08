<template>
  <div class="page-shell auth-page">
    <h1 class="page-title">A validar o link…</h1>
    <p v-if="!done" class="page-subtitle">A processar o link de email. Um momento.</p>
    <div v-if="formError" class="av-card av-card-pad">
      <p class="form-error">{{ formError }}</p>
      <p class="muted">
        O link pode ter expirado, já ter sido usado, ou ter sido aberto noutro browser (fluxo
        PKCE). Peça um código novo em Entrar e use o <strong>código de 6 dígitos</strong> do
        email no mesmo dispositivo onde pediu o link.
      </p>
      <router-link class="btn btn--primary" to="/entrar">Ir para Entrar</router-link>
    </div>
    <p v-else-if="done && auth.isLoggedIn" class="page-subtitle">Sessão iniciada. A redireccionar…</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import '@/css/auth.scss'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const formError = ref('')
const done = ref(false)

onMounted(async () => {
  // init() já consome a URL; aqui só decidimos para onde ir
  if (!auth.ready) {
    await auth.init()
  }

  done.value = true

  if (auth.error && !auth.isLoggedIn) {
    formError.value = auth.error
    return
  }

  if (auth.isLoggedIn) {
    const next = typeof route.query.next === 'string' ? route.query.next : '/perfil'
    // recovery: forçar página de password se o evento o pediu
    if (auth.passwordRecovery) {
      await router.replace('/atualizar-password')
      return
    }
    await router.replace(next.startsWith('/') ? next : `/${next}`)
    return
  }

  formError.value =
    auth.error ||
    'Não foi possível iniciar sessão a partir do link. Use o código do email em Entrar.'
})
</script>

<style scoped lang="scss">
.muted {
  color: var(--pt-muted);
  line-height: 1.45;
  margin: 0 0 1rem;
}
.form-error {
  color: var(--pt-red);
  font-weight: 700;
  margin: 0 0 0.75rem;
}
.btn {
  margin-top: 0.25rem;
}
</style>
