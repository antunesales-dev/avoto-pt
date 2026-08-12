import { defineBoot } from '#q-app'
import { Notify } from 'quasar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { fetchNotificationPrefs, showLocalNotification } from '@/lib/notifications'

/**
 * Notificações locais (tab / PWA instalada) via Realtime:
 * - resumo do dia (daily digests) — AR + despesa
 * - novas iniciativas (leis / votações)
 * - novos investimentos (consulta)
 * - novos comunicados do Governo (consulta, sem voto)
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
        notify_comunicados: true,
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
      despesa: prefs.notify_despesa,
      comunicado: prefs.notify_comunicados,
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
          body:
            d?.summary ||
            'Há um novo resumo da actividade pública (Parlamento e despesa).',
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
          body: inv?.titulo || 'Foi registado um contrato de valor elevado (consulta).',
          url: inv?.id ? `/investimentos/${inv.id}` : '/investimentos',
          tag: `inv-${inv?.id || Date.now()}`,
        })
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'despesas_publicas' },
      async (payload) => {
        const d = payload.new
        await maybeNotify('despesa', {
          title: 'Nova despesa / contrato',
          body: d?.titulo || 'Foi importado um contrato público (consulta).',
          url: d?.id ? `/despesa/${d.id}` : '/despesa',
          tag: `desp-${d?.id || Date.now()}`,
        })
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'comunicados' },
      async (payload) => {
        const c = payload.new
        await maybeNotify('comunicado', {
          title: 'Novo comunicado oficial',
          body: c?.titulo || 'Há um novo comunicado do Governo (informação — sem voto).',
          url: c?.id ? `/comunicados/${c.id}` : '/comunicados',
          tag: `com-${c?.id || Date.now()}`,
        })
      },
    )
    .subscribe()
})
