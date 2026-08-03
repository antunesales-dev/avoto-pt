import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { emailSchema, loginSchema, passwordSchema, registoSchema } from '@/lib/schemas'

/**
 * Auth real via Supabase.
 * PII e votos: encriptados na BD (Vault + pgcrypto); acesso só via RPC.
 */
function appBaseUrl() {
  if (typeof window === 'undefined') return ''
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${window.location.origin}${base}`
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
        // perfil criado pelo trigger; pequeno retry se CID ainda não existir
        for (let i = 0; i < 5; i++) {
          await fetchProfile()
          if (profile.value?.cid) break
          await new Promise((r) => setTimeout(r, 150))
        }
        if (parsed.data.partidoPreferencia) {
          await updatePartido(parsed.data.partidoPreferencia)
        }
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

  async function sair() {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signOut()
      if (err) throw err
      session.value = null
      profile.value = null
      passwordRecovery.value = false
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
    sair,
    pedirRecuperacao,
    atualizarPassword,
    reenviarConfirmacao,
    updatePartido,
    fetchProfile,
    getVoto,
    listMeusVotos,
    castVoto,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
