const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'inicio',
        component: () => import('@/pages/IndexPage.vue'),
        meta: { title: 'Início' },
      },
      {
        path: 'iniciativas',
        name: 'iniciativas',
        component: () => import('@/pages/IniciativasPage.vue'),
        meta: { title: 'Iniciativas' },
      },
      {
        path: 'iniciativas/:id',
        name: 'iniciativa-detalhe',
        component: () => import('@/pages/IniciativaDetailPage.vue'),
        meta: { title: 'Iniciativa' },
      },
      {
        path: 'comparacao',
        name: 'comparacao',
        component: () => import('@/pages/ComparacaoPage.vue'),
        meta: { title: 'Comparação' },
      },
      {
        path: 'metricas',
        name: 'metricas',
        component: () => import('@/pages/MetricasPage.vue'),
        meta: { title: 'Métricas' },
      },
      {
        path: 'como-funciona',
        name: 'como-funciona',
        component: () => import('@/pages/ComoFuncionaPage.vue'),
        meta: { title: 'Como funciona' },
      },
      {
        path: 'dados',
        name: 'dados',
        component: () => import('@/pages/DadosPage.vue'),
        meta: { title: 'Fontes de dados' },
      },
      {
        path: 'sobre',
        name: 'sobre',
        component: () => import('@/pages/SobrePage.vue'),
        meta: { title: 'Sobre' },
      },
      {
        path: 'privacidade',
        name: 'privacidade',
        component: () => import('@/pages/PrivacidadePage.vue'),
        meta: { title: 'Privacidade' },
      },
      {
        path: 'perfil',
        name: 'perfil',
        component: () => import('@/pages/PerfilPage.vue'),
        meta: { title: 'Perfil' },
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes
