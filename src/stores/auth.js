import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { loginSchema, registoSchema } from '@/lib/schemas'

/**
 * Auth real via Supabase — sem sessão fictícia.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const profile = ref(null)
  const ready = ref(false)
  const loading = ref(false)
  const error = ref(null)

  const isLoggedIn = computed(() => session.value?.user != null)
  const user = computed(() => session.value?.user ?? null)
  const cid = computed(() => profile.value?.cid ?? null)
  const email = computed(() => profile.value?.email ?? user.value?.email ?? null)

  async function fetchProfile(userId) {
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, cid, email, partido_preferencia, created_at')
      .eq('id', userId)
      .maybeSingle()

    if (err) throw err
    profile.value = data
    return data
  }

  async function init() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.auth.getSession()
      if (err) throw err
      session.value = data.session
      if (data.session?.user) {
        await fetchProfile(data.session.user.id)
      } else {
        profile.value = null
      }

      supabase.auth.onAuthStateChange(async (_event, next) => {
        session.value = next
        if (next?.user) {
          try {
            await fetchProfile(next.user.id)
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
      const msg = parsed.error.issues[0]?.message || 'Dados inválidos.'
      throw new Error(msg)
    }

    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
      })
      if (err) throw err
      if (!data.session && data.user) {
        // email confirmation required (remoto); local tem confirmations=false
        return { needsEmailConfirmation: true, user: data.user }
      }
      session.value = data.session
      if (data.user) {
        await fetchProfile(data.user.id)
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
      if (data.user) await fetchProfile(data.user.id)
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
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePartido(partido) {
    if (!user.value) throw new Error('AUTH_REQUIRED')
    const { data, error: err } = await supabase
      .from('profiles')
      .update({ partido_preferencia: partido || null, updated_at: new Date().toISOString() })
      .eq('id', user.value.id)
      .select()
      .single()
    if (err) throw err
    profile.value = data
    return data
  }

  /** Voto do utilizador numa iniciativa (ou null) */
  async function getVoto(iniciativaId) {
    if (!user.value) return null
    const { data, error: err } = await supabase
      .from('votos_cidadaos')
      .select('voto, created_at')
      .eq('iniciativa_id', iniciativaId)
      .eq('user_id', user.value.id)
      .maybeSingle()
    if (err) throw err
    return data?.voto ?? null
  }

  async function listMeusVotos() {
    if (!user.value) return []
    const { data, error: err } = await supabase
      .from('votos_cidadaos')
      .select('iniciativa_id, voto, created_at')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
    if (err) throw err
    return data || []
  }

  /**
   * Voto imutável via RPC. Falha com ALREADY_VOTED se já existir.
   */
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
    isLoggedIn,
    user,
    cid,
    email,
    init,
    registar,
    entrar,
    sair,
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
