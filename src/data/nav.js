/** Navegação principal */
export const navPrincipal = [
  { to: '/', label: 'Início', icon: 'home', exact: true },
  { to: '/iniciativas', label: 'Iniciativas', icon: 'gavel' },
  { to: '/digest', label: 'Digest', icon: 'today' },
  { to: '/despesa', label: 'Despesa', icon: 'account_balance' },
  { to: '/investimentos', label: 'Investimentos', icon: 'savings' },
]

/** Menu Mais */
export const navMais = [
  { to: '/comparacao', label: 'Comparação', icon: 'compare_arrows' },
  { to: '/metricas', label: 'Métricas', icon: 'insights' },
  { to: '/como-funciona', label: 'Como funciona', icon: 'help_outline' },
  { to: '/porque', label: 'O porquê', icon: 'menu_book' },
  { to: '/dados', label: 'Fontes de dados', icon: 'storage' },
  { to: '/sobre', label: 'Sobre', icon: 'info_outline' },
  { to: '/privacidade', label: 'Privacidade', icon: 'privacy_tip' },
  { to: '/termos', label: 'Termos de uso', icon: 'gavel' },
  { to: '/cookies', label: 'Cookies', icon: 'cookie' },
  { to: '/direitos', label: 'Direitos RGPD', icon: 'policy' },
]

/** Rodapé legal (RGPD) */
export const navLegal = [
  { to: '/privacidade', label: 'Privacidade' },
  { to: '/termos', label: 'Termos de uso' },
  { to: '/cookies', label: 'Cookies' },
  { to: '/direitos', label: 'Direitos RGPD' },
]

export const navegacao = [...navPrincipal, ...navMais]
