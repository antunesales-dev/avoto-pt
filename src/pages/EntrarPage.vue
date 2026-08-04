<template>
  <div class="page-shell auth-page">
    <h1 class="page-title">Entrar</h1>
    <p class="page-subtitle">
      Sem palavra-passe: enviamos um <strong>link</strong> e um <strong>código</strong> para o seu
      email. Mais simples e evita reutilizar passwords. Um ID de cidadão por pessoa.
    </p>

    <!-- Passo 1: pedir email -->
    <form
      v-if="step === 'email'"
      class="av-card av-card-pad auth-form"
      @submit.prevent="onEnviarCodigo"
    >
      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" required />
      </label>

      <TurnstileWidget
        ref="turnstileRef"
        :reset-key="turnstileReset"
        @token="onTurnstileToken"
      />

      <p v-if="formError" class="form-error">{{ formError }}</p>
      <button
        type="submit"
        class="btn btn--primary"
        :disabled="auth.loading || (turnstileRequired && !turnstileToken)"
      >
        {{ auth.loading ? 'A enviar…' : 'Receber link / código' }}
      </button>

      <button type="button" class="btn btn--ghost btn--sm" @click="showPassword = !showPassword">
        {{ showPassword ? 'Esconder palavra-passe' : 'Entrar com palavra-passe (opcional)' }}
      </button>

      <template v-if="showPassword">
        <label class="field">
          <span>Palavra-passe</span>
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <button type="button" class="btn btn--outline" :disabled="auth.loading" @click="onPassword">
          Entrar com palavra-passe
        </button>
      </template>

      <div class="auth-links">
        <router-link to="/recuperar-password">Recuperar palavra-passe</router-link>
        <router-link to="/confirmar-email">Reenviar confirmação</router-link>
      </div>
      <p class="auth-switch">
        Primeira vez? Use o mesmo formulário — a conta é criada no primeiro acesso.
      </p>
      <p class="auth-legal">
        Ao continuar, aceita os
        <router-link to="/termos">Termos de uso</router-link>
        e a
        <router-link to="/privacidade">Política de Privacidade</router-link>.
        Ver também
        <router-link to="/cookies">Cookies</router-link>
        e
        <router-link to="/direitos">direitos RGPD</router-link>.
      </p>
    </form>

    <!-- Passo 2: código OTP -->
    <form v-else class="av-card av-card-pad auth-form" @submit.prevent="onVerificarCodigo">
      <p class="form-info">
        Enviámos um email para <strong>{{ email }}</strong>. Pode clicar no link ou introduzir o
        código aqui.
      </p>
      <label class="field">
        <span>Código do email</span>
        <input
          v-model="otp"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          required
          minlength="6"
          maxlength="10"
          placeholder="123456"
        />
      </label>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <button type="submit" class="btn btn--primary" :disabled="auth.loading">
        {{ auth.loading ? 'A verificar…' : 'Confirmar código' }}
      </button>
      <button
        type="button"
        class="btn btn--ghost btn--sm"
        :disabled="auth.loading || (turnstileRequired && !turnstileToken)"
        @click="onEnviarCodigo"
      >
        Reenviar
      </button>
      <button type="button" class="btn btn--ghost btn--sm" @click="step = 'email'">
        Mudar email
      </button>
      <TurnstileWidget
        v-if="step === 'otp'"
        :reset-key="turnstileReset"
        @token="onTurnstileToken"
      />
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import { useAuthStore } from '@/stores/auth'
import '@/css/auth.scss'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()

const email = ref('')
const password = ref('')
const otp = ref('')
const step = ref('email')
const showPassword = ref(false)
const formError = ref('')
const turnstileToken = ref('')
const turnstileReset = ref(0)
const turnstileRef = ref(null)

const turnstileRequired = computed(() => Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY))

function onTurnstileToken(t) {
  turnstileToken.value = t || ''
}

function bumpTurnstile() {
  turnstileToken.value = ''
  turnstileReset.value += 1
}

onMounted(async () => {
  if (auth.isLoggedIn) {
    goAfterLogin()
  }
})

function goAfterLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/perfil'
  router.replace(redirect)
}

async function onEnviarCodigo() {
  formError.value = ''
  if (turnstileRequired.value && !turnstileToken.value) {
    formError.value = 'Complete a verificação anti-bot antes de continuar.'
    return
  }
  try {
    await auth.enviarMagicLink(email.value, turnstileToken.value)
    step.value = 'otp'
    bumpTurnstile()
    $q.notify({
      type: 'positive',
      message: 'Email enviado. Use o link ou o código.',
      position: 'top',
    })
  } catch (e) {
    bumpTurnstile()
    if (e.code === 'RATE_LIMITED' || /RATE_LIMITED|demasiados pedidos/i.test(e.message || '')) {
      formError.value =
        'Demasiados pedidos deste dispositivo ou rede. Espere cerca de uma hora e tente de novo.'
    } else if (
      e.code === 'DEVICE_ACCOUNT_LIMIT' ||
      /limite de contas/i.test(e.message || '')
    ) {
      formError.value =
        'Limite de contas neste dispositivo. Entre com uma conta existente ou use outro dispositivo.'
    } else if (e.code === 'TURNSTILE_FAILED' || /TURNSTILE|anti-bot/i.test(e.message || '')) {
      formError.value = 'Verificação anti-bot falhou. Complete o desafio e tente de novo.'
    } else {
      formError.value = e.message || 'Não foi possível enviar o email.'
    }
  }
}

async function onVerificarCodigo() {
  formError.value = ''
  try {
    await auth.verificarOtp(email.value, otp.value)
    $q.notify({
      type: 'positive',
      message: auth.cid ? `Sessão iniciada · ${auth.cid}` : 'Sessão iniciada.',
      position: 'top',
    })
    goAfterLogin()
  } catch (e) {
    formError.value = e.message || 'Código inválido ou expirado.'
  }
}

async function onPassword() {
  formError.value = ''
  try {
    await auth.entrar({ email: email.value, password: password.value })
    goAfterLogin()
  } catch (e) {
    const msg = e.message || 'Não foi possível entrar.'
    if (/confirm|verif|email/i.test(msg)) {
      formError.value = 'Confirme o email antes de entrar com palavra-passe.'
    } else {
      formError.value = msg
    }
  }
}
</script>
