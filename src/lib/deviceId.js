/**
 * Identificador estável por browser/dispositivo (localStorage).
 * Não é à prova de limpeza de dados / VPN — reduz abuso casual.
 */
const KEY = 'avoto-device-id'

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function getDeviceId() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return `ssr-${randomId()}`
  }
  try {
    let id = localStorage.getItem(KEY)
    if (!id || id.length < 8) {
      id = randomId()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return randomId()
  }
}
