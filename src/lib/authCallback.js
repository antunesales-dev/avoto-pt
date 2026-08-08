import { supabase } from '@/lib/supabase'

/**
 * Processa o retorno do magic link / OTP / OAuth da Supabase na URL.
 * Cobre: ?code= (PKCE), #access_token= (implicit), ?token_hash=&type= (email verify).
 * Limpa a URL para o router não “perder” o estado no próximo refresh.
 */

const STRIP_QUERY = [
  'code',
  'token_hash',
  'type',
  'error',
  'error_description',
  'error_code',
]

export function cleanAuthParamsFromUrl() {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    let changed = false
    for (const k of STRIP_QUERY) {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k)
        changed = true
      }
    }
    if (url.hash && /access_token|refresh_token|token_hash|error/i.test(url.hash)) {
      url.hash = ''
      changed = true
    }
    if (changed) {
      const next = url.pathname + (url.search || '')
      window.history.replaceState(window.history.state || {}, document.title, next)
    }
  } catch {
    /* ignore */
  }
}

export function urlLooksLikeAuthCallback() {
  if (typeof window === 'undefined') return false
  try {
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(
      url.hash.startsWith('#') ? url.hash.slice(1) : url.hash,
    )
    if (url.searchParams.get('code')) return true
    if (url.searchParams.get('token_hash')) return true
    if (url.searchParams.get('error') || url.searchParams.get('error_description')) return true
    if (hash.get('access_token') || hash.get('refresh_token') || hash.get('token_hash')) return true
    if (hash.get('error') || hash.get('error_description')) return true
    return false
  } catch {
    return false
  }
}

/**
 * @returns {Promise<{ session: import('@supabase/supabase-js').Session | null, error: string | null, handled: boolean }>}
 */
export async function consumeAuthCallbackFromUrl() {
  if (typeof window === 'undefined') {
    return { session: null, error: null, handled: false }
  }
  if (!urlLooksLikeAuthCallback()) {
    return { session: null, error: null, handled: false }
  }

  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
  const q = url.searchParams

  const errDesc =
    q.get('error_description') ||
    hash.get('error_description') ||
    q.get('error') ||
    hash.get('error')
  if (errDesc) {
    cleanAuthParamsFromUrl()
    return {
      session: null,
      error: decodeURIComponent(String(errDesc).replace(/\+/g, ' ')),
      handled: true,
    }
  }

  // PKCE: ?code=
  const code = q.get('code')
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    cleanAuthParamsFromUrl()
    if (error) {
      return {
        session: null,
        error:
          error.message ||
          'Não foi possível validar o link (código expirado ou aberto noutro browser). Peça um código novo ou use o código de 6 dígitos no email.',
        handled: true,
      }
    }
    return { session: data.session, error: null, handled: true }
  }

  // Email template token_hash
  const token_hash = q.get('token_hash') || hash.get('token_hash')
  const type = (q.get('type') || hash.get('type') || 'email').replace(/^magiclink$/i, 'magiclink')
  if (token_hash) {
    const otpType = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'].includes(
      type,
    )
      ? type
      : 'email'
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType,
    })
    cleanAuthParamsFromUrl()
    if (error) {
      return {
        session: null,
        error: error.message || 'Link inválido ou expirado.',
        handled: true,
      }
    }
    return { session: data.session, error: null, handled: true }
  }

  // Implicit: #access_token= & #refresh_token=
  const access_token = hash.get('access_token')
  const refresh_token = hash.get('refresh_token')
  if (access_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    })
    cleanAuthParamsFromUrl()
    if (error) {
      return { session: null, error: error.message || 'Sessão inválida no link.', handled: true }
    }
    return { session: data.session, error: null, handled: true }
  }

  // Fallback: cliente com detectSessionInUrl
  const { data, error } = await supabase.auth.getSession()
  cleanAuthParamsFromUrl()
  if (error) {
    return { session: null, error: error.message, handled: true }
  }
  return { session: data.session, error: null, handled: true }
}
