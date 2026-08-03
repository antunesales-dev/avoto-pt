import { defineRouter } from '#q-app'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'

import routes from './routes.js'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : (import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to) => {
    // Pinia já está montado quando o router corre em navegação
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    if (!auth.ready) {
      await auth.init()
    }
    if (to.meta?.requiresAuth && !auth.isLoggedIn) {
      return { name: 'entrar', query: { redirect: to.fullPath } }
    }
    if (to.meta?.guestOnly && auth.isLoggedIn) {
      return { name: 'perfil' }
    }
    return true
  })

  Router.afterEach((to) => {
    const page = to.meta?.title ? `${to.meta.title} · ` : ''
    document.title = `${page}A Voto — Bancada Cidadã`
  })

  return Router
})
