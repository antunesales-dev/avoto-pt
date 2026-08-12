import { supabase } from '@/lib/supabase'

const DEFAULT_PREFS = {
  notify_digest: true,
  notify_iniciativas: true,
  notify_investimentos: true,
  notify_despesa: false,
  notify_comunicados: true,
}

export function notificationSupport() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission() {
  if (!notificationSupport()) return 'unsupported'
  return Notification.permission
}

/** Pede permissão ao browser (só em gesto do utilizador). */
export async function requestNotificationPermission() {
  if (!notificationSupport()) {
    throw new Error('Este browser não suporta notificações.')
  }
  const result = await Notification.requestPermission()
  return result
}

export async function fetchNotificationPrefs(userId) {
  if (!userId) return { ...DEFAULT_PREFS }
  const { data, error } = await supabase
    .from('notification_prefs')
    .select(
      'notify_digest, notify_iniciativas, notify_investimentos, notify_despesa, notify_comunicados',
    )
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    // cria defaults se o trigger ainda não correu
    const { error: insErr } = await supabase.from('notification_prefs').insert({
      user_id: userId,
      ...DEFAULT_PREFS,
    })
    if (insErr && !/duplicate|unique/i.test(insErr.message || '')) throw insErr
    return { ...DEFAULT_PREFS }
  }
  return {
    notify_digest: data.notify_digest !== false,
    notify_iniciativas: data.notify_iniciativas !== false,
    notify_investimentos: data.notify_investimentos !== false,
    notify_despesa: data.notify_despesa === true,
    notify_comunicados: data.notify_comunicados !== false,
  }
}

export async function saveNotificationPrefs(userId, prefs) {
  if (!userId) throw new Error('AUTH_REQUIRED')
  const row = {
    user_id: userId,
    notify_digest: !!prefs.notify_digest,
    notify_iniciativas: !!prefs.notify_iniciativas,
    notify_investimentos: !!prefs.notify_investimentos,
    notify_despesa: !!prefs.notify_despesa,
    notify_comunicados: !!prefs.notify_comunicados,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('notification_prefs').upsert(row, {
    onConflict: 'user_id',
  })
  if (error) throw error
  return row
}

/**
 * Mostra notificação local (tab aberta ou PWA instalada).
 * Com app fechada é preciso Web Push (VAPID) — ver docs/AUTH-PWA.md.
 */
export async function showLocalNotification({ title, body, url = '/', tag }) {
  if (!notificationSupport() || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg?.showNotification) {
      await reg.showNotification(title, {
        body,
        icon: 'icons/icon-192x192.png',
        badge: 'icons/icon-128x128.png',
        data: { url },
        tag: tag || `avoto-${Date.now()}`,
      })
      return true
    }
    // eslint-disable-next-line no-new
    new Notification(title, { body, icon: 'icons/icon-192x192.png' })
    return true
  } catch {
    return false
  }
}
