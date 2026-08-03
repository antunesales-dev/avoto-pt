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
      info.value =
        'Conta criada. Confirme o email (se a verificação estiver activa) e depois entre.'
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

.form-info {
  margin: 0;
  color: var(--pt-green-dark);
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
