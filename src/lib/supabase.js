import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Fail loud: sem env não há “modo demo” silencioso */
export function assertSupabaseEnv() {
  if (!url || !anonKey) {
    throw new Error(
      'Configuração em falta: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ver .env.example).',
    )
  }
}

export const isSupabaseConfigured = Boolean(url && anonKey)

assertSupabaseEnv()

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // true: o client tenta ler a URL; authCallback.js faz o resto (code / token_hash / hash)
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'avoto-auth',
  },
})
