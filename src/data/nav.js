/** Navegação principal */
export const navPrincipal = [
  { to: '/', label: 'Início', icon: 'home', exact: true },
  { to: '/iniciativas', label: 'Iniciativas', icon: 'gavel' },
  { to: '/comparacao', label: 'Comparação', icon: 'compare_arrows' },
  { to: '/metricas', label: 'Métricas', icon: 'insights' },
]

/** Menu Mais */
export const navMais = [
  { to: '/como-funciona', label: 'Como funciona', icon: 'help_outline' },
  { to: '/dados', label: 'Fontes de dados', icon: 'storage' },
  { to: '/sobre', label: 'Sobre', icon: 'info_outline' },
  { to: '/privacidade', label: 'Privacidade', icon: 'privacy_tip' },
]

export const navegacao = [...navPrincipal, ...navMais]
