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
      <p v-if="cooldownLeft > 0" class="form-info cooldown-hint">
        Aguarde {{ formatCooldown(cooldownLeft) }} antes de pedir outro código (evita esgotar o
        limite de email da Supabase).
      </p>
      <button
        type="submit"
        class="btn btn--primary"
        :disabled="otpSendDisabled"
      >
        {{ sendButtonLabel }}
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
        :disabled="otpSendDisabled"
        @click="onEnviarCodigo"
      >
        {{ cooldownLeft > 0 ? `Reenviar (${formatCooldown(cooldownLeft)})` : 'Reenviar' }}
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import { useAuthStore } from '@/stores/auth'
import '@/css/auth.scss'

/** Cooldown local: após envio OK (60s) ou EMAIL_RATE_LIMITED (1h) — não martelar /otp. */
const COOLDOWN_OK_MS = 60_000
const COOLDOWN_EMAIL_LIMIT_MS = 60 * 60_000
const COOLDOWN_KEY = 'avoto_otp_cooldown_until'

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
const cooldownUntil = ref(0)
const nowTick = ref(Date.now())
let cooldownTimer = null

const turnstileRequired = computed(() => Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY))

const cooldownLeft = computed(() => Math.max(0, cooldownUntil.value - nowTick.value))

const otpSendDisabled = computed(
  () =>
    auth.loading ||
    cooldownLeft.value > 0 ||
    (turnstileRequired.value && !turnstileToken.value),
)

const sendButtonLabel = computed(() => {
  if (auth.loading) return 'A enviar…'
  if (cooldownLeft.value > 0) return `Aguarde ${formatCooldown(cooldownLeft.value)}`
  return 'Receber link / código'
})

function formatCooldown(ms) {
  const s = Math.ceil(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.ceil(s / 60)
  return m === 1 ? '1 min' : `${m} min`
}

function setCooldown(ms) {
  const until = Date.now() + ms
  cooldownUntil.value = until
  try {
    localStorage.setItem(COOLDOWN_KEY, String(until))
  } catch {
    /* private mode */
  }
}

function loadCooldown() {
  try {
    const v = Number(localStorage.getItem(COOLDOWN_KEY) || 0)
    if (v > Date.now()) cooldownUntil.value = v
  } catch {
    /* ignore */
  }
}

function onTurnstileToken(t) {
  turnstileToken.value = t || ''
}

function bumpTurnstile() {
  turnstileToken.value = ''
  turnstileReset.value += 1
}

onMounted(async () => {
  loadCooldown()
  cooldownTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
  if (auth.isLoggedIn) {
    goAfterLogin()
  }
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

function goAfterLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/perfil'
  router.replace(redirect)
}

async function onEnviarCodigo() {
  formError.value = ''
  if (cooldownLeft.value > 0) {
    formError.value = `Aguarde ${formatCooldown(cooldownLeft.value)} antes de pedir outro código.`
    return
  }
  if (turnstileRequired.value && !turnstileToken.value) {
    formError.value = 'Complete a verificação anti-bot antes de continuar.'
    return
  }
  try {
    await auth.enviarMagicLink(email.value, turnstileToken.value)
    setCooldown(COOLDOWN_OK_MS)
    step.value = 'otp'
    bumpTurnstile()
    $q.notify({
      type: 'positive',
      message: 'Email enviado. Use o link ou o código.',
      position: 'top',
    })
  } catch (e) {
    bumpTurnstile()
    const m = e.message || ''
    if (
      e.code === 'EMAIL_RATE_LIMITED' ||
      /EMAIL_RATE_LIMITED|fornecedor de email|serviço de email|over_email/i.test(`${e.code} ${m}`)
    ) {
      setCooldown(COOLDOWN_EMAIL_LIMIT_MS)
      formError.value =
        m ||
        'O serviço de email da Supabase limitou envios. Espere cerca de 1 hora, ou use palavra-passe se já tiver.'
    } else if (e.code === 'RATE_LIMITED' || /demasiados pedidos/i.test(m)) {
      setCooldown(COOLDOWN_OK_MS * 5)
      formError.value =
        m ||
        'Demasiados pedidos neste dispositivo ou rede. Espere e tente de novo, ou use palavra-passe.'
    } else if (
      e.code === 'DEVICE_ACCOUNT_LIMIT' ||
      /limite de contas/i.test(m)
    ) {
      formError.value =
        'Limite de contas neste dispositivo. Entre com uma conta existente ou use outro dispositivo.'
    } else if (e.code === 'TURNSTILE_FAILED' || /TURNSTILE|anti-bot/i.test(m)) {
      formError.value = 'Verificação anti-bot falhou. Complete o desafio e tente de novo.'
    } else {
      formError.value = m || 'Não foi possível enviar o email.'
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
