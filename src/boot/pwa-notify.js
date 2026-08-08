import { defineBoot } from '#q-app'
import { Notify } from 'quasar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { fetchNotificationPrefs, showLocalNotification } from '@/lib/notifications'

/**
 * Notificações locais (tab / PWA instalada) via Realtime:
 * - resumo do dia (daily digests)
 * - novas iniciativas (leis / votações)
 * - novos investimentos
 *
 * Push com app fechada: VAPID + edge (docs/AUTH-PWA.md).
 */
export default defineBoot(() => {
  const auth = useAuthStore()

  async function prefsFor(userId) {
    try {
      return await fetchNotificationPrefs(userId)
    } catch {
      return {
        notify_digest: true,
        notify_iniciativas: true,
        notify_investimentos: true,
        notify_despesa: false,
      }
    }
  }

  async function maybeNotify(kind, payload) {
    if (!auth.isLoggedIn || !auth.user?.id) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const prefs = await prefsFor(auth.user.id)
    const flag = {
      digest: prefs.notify_digest,
      iniciativa: prefs.notify_iniciativas,
      investimento: prefs.notify_investimentos,
    }[kind]
    if (!flag) return

    const shown = await showLocalNotification(payload)
    if (!shown) {
      Notify.create({
        type: 'info',
        message: `${payload.title}: ${payload.body}`,
        position: 'top',
      })
    }
  }

  supabase
    .channel('avoto-civic-notify')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'daily_digests' },
      async (payload) => {
        const d = payload.new
        await maybeNotify('digest', {
          title: d?.title || 'Resumo do dia · A Voto',
          body: d?.summary || 'Há um novo resumo da actividade pública (Parlamento, despesa, investimentos).',
          url: '/digest',
          tag: `digest-${d?.id || Date.now()}`,
        })
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'iniciativas' },
      async (payload) => {
        const i = payload.new
        await maybeNotify('iniciativa', {
          title: 'Nova iniciativa / votação',
          body: i?.titulo || 'Há uma nova lei ou proposta a acompanhar.',
          url: i?.id ? `/iniciativas/${i.id}` : '/iniciativas',
          tag: `ini-${i?.id || Date.now()}`,
        })
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'investimentos' },
      async (payload) => {
        const inv = payload.new
        await maybeNotify('investimento', {
          title: 'Novo investimento público',
          body: inv?.titulo || 'Foi registado um investimento para a sua opinião.',
          url: inv?.id ? `/investimentos/${inv.id}` : '/investimentos',
          tag: `inv-${inv?.id || Date.now()}`,
        })
      },
    )
    .subscribe()
})
