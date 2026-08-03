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
    detectSessionInUrl: true,
    storageKey: 'avoto-auth',
  },
})
