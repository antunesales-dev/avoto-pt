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
        path: 'digest',
        name: 'digest',
        component: () => import('@/pages/DigestPage.vue'),
        meta: { title: 'Resumo do dia' },
      },
      {
        path: 'despesa',
        name: 'despesa',
        component: () => import('@/pages/DespesaPage.vue'),
        meta: { title: 'Despesa pública' },
      },
      {
        path: 'despesa/:id',
        name: 'despesa-detalhe',
        component: () => import('@/pages/DespesaDetailPage.vue'),
        meta: { title: 'Despesa' },
      },
      {
        path: 'investimentos',
        name: 'investimentos',
        component: () => import('@/pages/InvestimentosPage.vue'),
        meta: { title: 'Investimentos' },
      },
      {
        path: 'investimentos/:id',
        name: 'investimento-detalhe',
        component: () => import('@/pages/InvestimentoDetailPage.vue'),
        meta: { title: 'Investimento' },
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
        path: 'porque',
        name: 'porque',
        component: () => import('@/pages/PorquePage.vue'),
        meta: { title: 'O porquê' },
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
        path: 'termos',
        name: 'termos',
        component: () => import('@/pages/TermosPage.vue'),
        meta: { title: 'Termos de uso' },
      },
      {
        path: 'cookies',
        name: 'cookies',
        component: () => import('@/pages/CookiesPage.vue'),
        meta: { title: 'Cookies' },
      },
      {
        path: 'direitos',
        name: 'direitos',
        component: () => import('@/pages/DireitosPage.vue'),
        meta: { title: 'Direitos RGPD' },
      },
      {
        path: 'perfil',
        name: 'perfil',
        component: () => import('@/pages/PerfilPage.vue'),
        meta: { title: 'Perfil', requiresAuth: true },
      },
      {
        path: 'entrar',
        name: 'entrar',
        component: () => import('@/pages/EntrarPage.vue'),
        meta: { title: 'Entrar', guestOnly: true },
      },
      {
        path: 'registo',
        name: 'registo',
        component: () => import('@/pages/RegistoPage.vue'),
        meta: { title: 'Criar conta', guestOnly: true },
      },
      {
        path: 'recuperar-password',
        name: 'recuperar-password',
        component: () => import('@/pages/RecuperarPasswordPage.vue'),
        meta: { title: 'Recuperar palavra-passe', guestOnly: true },
      },
      {
        path: 'atualizar-password',
        name: 'atualizar-password',
        component: () => import('@/pages/AtualizarPasswordPage.vue'),
        meta: { title: 'Nova palavra-passe' },
      },
      {
        path: 'confirmar-email',
        name: 'confirmar-email',
        component: () => import('@/pages/ConfirmarEmailPage.vue'),
        meta: { title: 'Confirmar email', guestOnly: true },
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes
