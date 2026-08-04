import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref } from 'vue'
import { getDeviceId } from '@/lib/deviceId'
import { supabase } from '@/lib/supabase'
import { emailSchema, loginSchema, passwordSchema, registoSchema } from '@/lib/schemas'

/**
 * Auth real via Supabase.
 * PII e votos: encriptados na BD (Vault + pgcrypto); acesso só via RPC.
 * OTP/criação de conta: edge request-otp (rate limit IP + device).
 */
function appBaseUrl() {
  if (typeof window === 'undefined') return ''
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${window.location.origin}${base}`
}

/**
 * Extrai { error, message } do corpo da edge function.
 * O client Supabase devolve "Edge Function returned a non-2xx status code"
 * e esconde o JSON — sem isto o utilizador só vê lixo técnico.
 */
async function parseFunctionsError(fnErr, data) {
  // Às vezes o body vem em data mesmo com error
  if (data && typeof data === 'object' && (data.message || data.error)) {
    return {
      code: data.error || 'EDGE_ERROR',
      message: data.message || data.error || String(fnErr?.message || 'Erro no serviço.'),
    }
  }
  const ctx = fnErr?.context
  if (ctx) {
    try {
      // Response (fetch) ou clone
      if (typeof ctx.json === 'function') {
        const j = await ctx.clone?.().json?.() ?? (await ctx.json())
        if (j && (j.message || j.error)) {
          return {
            code: j.error || 'EDGE_ERROR',
            message: j.message || j.error,
          }
        }
      }
      if (typeof ctx.text === 'function') {
        const t = await ctx.clone?.().text?.() ?? (await ctx.text())
        try {
          const j = JSON.parse(t)
          if (j?.message || j?.error) {
            return { code: j.error || 'EDGE_ERROR', message: j.message || j.error }
          }
        } catch {
          if (t) return { code: 'EDGE_ERROR', message: t.slice(0, 280) }
        }
      }
    } catch {
      /* ignore */
    }
  }
  const raw = fnErr?.message || String(fnErr || 'Erro no serviço.')
  if (/non-2xx|FunctionsHttpError|429/i.test(raw)) {
    return {
      code: 'EDGE_HTTP',
      message:
        'Não foi possível contactar o serviço de login. Se acabou de pedir vários códigos, espere alguns minutos e tente de novo.',
    }
  }
  return { code: 'EDGE_ERROR', message: raw }
}

async function linkDeviceAfterLogin() {
  try {
    const deviceId = getDeviceId()
    await supabase.rpc('register_device_account', { p_device_id: deviceId })
  } catch (e) {
    // não bloquear sessão; log para ops
    console.warn('register_device_account', e?.message || e)
  }
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const profile = ref(null)
  const ready = ref(false)
  const loading = ref(false)
  const error = ref(null)
  /** true quando o link de email abriu uma sessão de recuperação */
  const passwordRecovery = ref(false)

  const isLoggedIn = computed(() => session.value?.user != null)
  const user = computed(() => session.value?.user ?? null)
  const cid = computed(() => profile.value?.cid ?? null)
  const email = computed(() => user.value?.email ?? null)

  async function fetchProfile() {
    if (!user.value) {
      profile.value = null
      return null
    }
    const { data, error: err } = await supabase.rpc('get_my_profile')
    if (err) throw err
    // rpc returns setof → array
    const row = Array.isArray(data) ? data[0] : data
    profile.value = row
      ? {
          id: row.id,
          cid: row.cid,
          partido_preferencia: row.partido_preferencia ?? null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }
      : null
    return profile.value
  }

  async function init() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.auth.getSession()
      if (err) throw err
      session.value = data.session
      if (data.session?.user) {
        await fetchProfile()
        await linkDeviceAfterLogin()
      } else {
        profile.value = null
      }

      supabase.auth.onAuthStateChange(async (event, next) => {
        if (event === 'PASSWORD_RECOVERY') {
          passwordRecovery.value = true
        }
        session.value = next
        if (next?.user) {
          try {
            await fetchProfile()
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
              await linkDeviceAfterLogin()
            }
          } catch (e) {
            console.error(e)
            profile.value = null
          }
        } else {
          profile.value = null
        }
      })
    } catch (e) {
      error.value = e.message || String(e)
      session.value = null
      profile.value = null
    } finally {
      ready.value = true
      loading.value = false
    }
  }

  async function registar({ email, password, passwordConfirm, partidoPreferencia }) {
    const parsed = registoSchema.safeParse({
      email,
      password,
      passwordConfirm,
      partidoPreferencia: partidoPreferencia || '',
    })
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Dados inválidos.')
    }

    loading.value = true
    error.value = null
    try {
      const deviceId = getDeviceId()
      const { data: gate, error: gateErr } = await supabase.functions.invoke('request-otp', {
        body: {
          email: parsed.data.email,
          device_id: deviceId,
          mode: 'check',
          // registo password: Turnstile no fluxo OTP é o principal; check usa token vazio se secret off
          turnstile_token: '',
        },
      })
      if (gateErr || gate?.error) {
        const msg =
          gate?.message ||
          gateErr?.message ||
          'Não foi possível criar conta a partir deste dispositivo.'
        const e = new Error(msg)
        e.code = gate?.error || 'DEVICE_ACCOUNT_LIMIT'
        throw e
      }

      const { data, error: err } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${appBaseUrl()}/entrar`,
        },
      })
      if (err) throw err
      if (!data.session && data.user) {
        return { needsEmailConfirmation: true, user: data.user, email: parsed.data.email }
      }
      session.value = data.session
      if (data.user) {
        for (let i = 0; i < 5; i++) {
          await fetchProfile()
          if (profile.value?.cid) break
          await new Promise((r) => setTimeout(r, 150))
        }
        if (parsed.data.partidoPreferencia) {
          await updatePartido(parsed.data.partidoPreferencia)
        }
        await linkDeviceAfterLogin()
      }
      return { needsEmailConfirmation: false, user: data.user }
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function entrar({ email, password }) {
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Dados inválidos.')
    }
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      })
      if (err) throw err
      session.value = data.session
      if (data.user) await fetchProfile()
      return data
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Login / registo sem palavra-passe via edge request-otp
   * (rate limit IP + device; máx. 2 contas novas por dispositivo).
   */
  async function enviarMagicLink(email, turnstileToken = '') {
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Email inválido.')
    }
    loading.value = true
    error.value = null
    try {
      const deviceId = getDeviceId()
      const { data, error: fnErr } = await supabase.functions.invoke('request-otp', {
        body: {
          email: parsed.data,
          device_id: deviceId,
          turnstile_token: turnstileToken || '',
          redirect_to: `${appBaseUrl()}/entrar`,
        },
      })
      if (fnErr || data?.error) {
        const parsedErr = await parseFunctionsError(fnErr, data)
        let msg = parsedErr.message
        let code = parsedErr.code
        // Ordem importa: EMAIL_RATE_LIMITED contém a substring RATE_LIMITED
        if (code === 'EMAIL_RATE_LIMITED' || /EMAIL_RATE_LIMITED|fornecedor de email/i.test(`${code} ${msg}`)) {
          code = 'EMAIL_RATE_LIMITED'
          msg =
            msg && /fornecedor|email|minutos/i.test(msg)
              ? msg
              : 'O serviço de email limitou envios. Espere cerca de 1 hora e tente de novo, ou use palavra-passe se já tiver.'
        } else if (
          code === 'RATE_LIMITED' ||
          (code !== 'EMAIL_RATE_LIMITED' && /\bRATE_LIMITED\b|Demasiados pedidos/i.test(`${code} ${msg}`))
        ) {
          code = 'RATE_LIMITED'
          msg =
            'Demasiados pedidos neste dispositivo ou rede. Espere e tente de novo, ou use palavra-passe.'
        } else if (/DEVICE_ACCOUNT_LIMIT|limite de contas/i.test(`${code} ${msg}`)) {
          code = 'DEVICE_ACCOUNT_LIMIT'
          msg =
            'Limite de contas neste dispositivo. Entre com uma conta existente ou use outro dispositivo.'
        } else if (/TURNSTILE|anti-bot|captcha/i.test(`${code} ${msg}`)) {
          code = 'TURNSTILE_FAILED'
          msg = 'Complete a verificação anti-bot e tente de novo.'
        }
        error.value = msg
        const err = new Error(msg)
        err.code = code
        throw err
      }
      return { email: parsed.data, allowCreate: data?.allow_create !== false }
    } catch (e) {
      if (e?.code) {
        error.value = e.message
        throw e
      }
      const msg = e.message || String(e)
      error.value = msg
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Confirma o código de 6–8 dígitos do email */
  async function verificarOtp(email, token) {
    const parsedEmail = emailSchema.safeParse(email)
    if (!parsedEmail.success) {
      throw new Error(parsedEmail.success === false ? parsedEmail.error.issues[0]?.message : 'Email inválido.')
    }
    const code = String(token || '').trim()
    if (code.length < 6) {
      throw new Error('Indique o código completo do email.')
    }
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.auth.verifyOtp({
        email: parsedEmail.data,
        token: code,
        type: 'email',
      })
      if (err) throw err
      session.value = data.session
      if (data.user) {
        for (let i = 0; i < 5; i++) {
          await fetchProfile()
          if (profile.value?.cid) break
          await new Promise((r) => setTimeout(r, 150))
        }
        await linkDeviceAfterLogin()
      }
      return data
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function sair() {
    loading.value = true
    error.value = null
    try {
      // Global primeiro; se falhar/rede, limpa sessão local na mesma
      const global = supabase.auth.signOut({ scope: 'global' })
      await Promise.race([
        global,
        new Promise((_, reject) => setTimeout(() => reject(new Error('SIGNOUT_TIMEOUT')), 4000)),
      ]).catch(async () => {
        await supabase.auth.signOut({ scope: 'local' })
      })
    } catch (e) {
      // Último recurso: limpar estado da app mesmo sem resposta do servidor
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        /* ignore */
      }
      error.value = e.message || String(e)
    } finally {
      session.value = null
      profile.value = null
      passwordRecovery.value = false
      loading.value = false
    }
  }

  /**
   * Apaga a conta (auth.users + cascata profiles/votos) via edge delete-my-account.
   * Requer sessão válida. Depois limpa estado local.
   */
  async function apagarConta() {
    if (!session.value?.access_token) {
      const e = new Error('Não tem sessão activa.')
      e.code = 'AUTH_REQUIRED'
      throw e
    }
    loading.value = true
    error.value = null
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('delete-my-account', {
        method: 'POST',
        body: {},
      })
      if (fnErr) {
        const msg = fnErr.message || String(fnErr)
        // Edge não deployada / 404
        if (/not found|404|Failed to send/i.test(msg)) {
          const e = new Error(
            'Serviço de apagar conta ainda não está activo no servidor. Contacte o suporte ou tente mais tarde.',
          )
          e.code = 'EDGE_MISSING'
          throw e
        }
        throw new Error(msg)
      }
      if (data?.error) {
        throw new Error(data.message || data.error)
      }
      await sair()
      return true
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Envia email com link para repor a palavra-passe */
  async function pedirRecuperacao(email) {
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Email inválido.')
    }
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${appBaseUrl()}/atualizar-password`,
      })
      if (err) throw err
      return true
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Define nova palavra-passe (após link de recuperação) */
  async function atualizarPassword(password, passwordConfirm) {
    if (password !== passwordConfirm) {
      throw new Error('As palavras-passe não coincidem.')
    }
    const parsed = passwordSchema.safeParse(password)
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Palavra-passe inválida.')
    }
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.updateUser({ password: parsed.data })
      if (err) throw err
      passwordRecovery.value = false
      return true
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function reenviarConfirmacao(email) {
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Email inválido.')
    }
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email: parsed.data,
        options: { emailRedirectTo: `${appBaseUrl()}/entrar` },
      })
      if (err) throw err
      return true
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePartido(partido) {
    if (!user.value) throw new Error('AUTH_REQUIRED')
    const { data, error: err } = await supabase.rpc('update_my_partido', {
      p_partido: partido || '',
    })
    if (err) throw err
    const row = Array.isArray(data) ? data[0] : data
    profile.value = row
      ? {
          id: row.id,
          cid: row.cid,
          partido_preferencia: row.partido_preferencia ?? null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }
      : profile.value
    return profile.value
  }

  async function getVoto(iniciativaId) {
    if (!user.value) return null
    const { data, error: err } = await supabase.rpc('get_my_voto', {
      p_iniciativa_id: iniciativaId,
    })
    if (err) throw err
    return data ?? null
  }

  async function listMeusVotos() {
    if (!user.value) return []
    const { data, error: err } = await supabase.rpc('list_my_votos')
    if (err) throw err
    return data || []
  }

  async function castVotoInvestimento(investimentoId, voto) {
    if (!user.value) {
      const e = new Error('AUTH_REQUIRED')
      e.code = 'AUTH_REQUIRED'
      throw e
    }
    const { data, error: err } = await supabase.rpc('cast_voto_investimento', {
      p_investimento_id: investimentoId,
      p_voto: voto,
    })
    if (err) {
      const msg = err.message || String(err)
      if (msg.includes('ALREADY_VOTED') || err.code === '23505') {
        const e = new Error('ALREADY_VOTED')
        e.code = 'ALREADY_VOTED'
        throw e
      }
      if (msg.includes('RATE_LIMITED')) {
        const e = new Error('RATE_LIMITED')
        e.code = 'RATE_LIMITED'
        throw e
      }
      throw err
    }
    return data
  }

  async function getVotoInvestimento(investimentoId) {
    if (!user.value) return null
    const { data, error: err } = await supabase.rpc('get_my_voto_investimento', {
      p_investimento_id: investimentoId,
    })
    if (err) throw err
    return data ?? null
  }

  async function castVoto(iniciativaId, voto) {
    if (!user.value) {
      const e = new Error('AUTH_REQUIRED')
      e.code = 'AUTH_REQUIRED'
      throw e
    }
    const { data, error: err } = await supabase.rpc('cast_voto', {
      p_iniciativa_id: iniciativaId,
      p_voto: voto,
    })
    if (err) {
      const msg = err.message || String(err)
      if (msg.includes('ALREADY_VOTED') || err.code === '23505') {
        const e = new Error('ALREADY_VOTED')
        e.code = 'ALREADY_VOTED'
        throw e
      }
      if (msg.includes('RATE_LIMITED') || msg.includes('rate')) {
        const e = new Error('RATE_LIMITED')
        e.code = 'RATE_LIMITED'
        throw e
      }
      if (msg.includes('AUTH_REQUIRED')) {
        const e = new Error('AUTH_REQUIRED')
        e.code = 'AUTH_REQUIRED'
        throw e
      }
      throw err
    }
    return data
  }

  return {
    session,
    profile,
    ready,
    loading,
    error,
    passwordRecovery,
    isLoggedIn,
    user,
    cid,
    email,
    init,
    registar,
    entrar,
    enviarMagicLink,
    verificarOtp,
    sair,
    apagarConta,
    pedirRecuperacao,
    atualizarPassword,
    reenviarConfirmacao,
    updatePartido,
    fetchProfile,
    getVoto,
    listMeusVotos,
    castVoto,
    castVotoInvestimento,
    getVotoInvestimento,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
