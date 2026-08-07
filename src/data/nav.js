/** Navegação principal (barra) */
export const navPrincipal = [
  { to: '/', label: 'Início', icon: 'home', exact: true },
  { to: '/iniciativas', label: 'Iniciativas', icon: 'gavel' },
  { to: '/digest', label: 'Resumo do dia', icon: 'today' },
  { to: '/despesa', label: 'Despesa', icon: 'account_balance' },
  { to: '/investimentos', label: 'Investimentos', icon: 'savings' },
]

/**
 * Menu “Mais”: agrupado por tema; dentro de cada grupo, ordem alfabética (pt).
 * 1) Análise — ferramentas sobre os dados
 * 2) A plataforma — entender a A Voto
 * 3) Legal e privacidade — RGPD e termos
 */
export const navMaisGroups = [
  {
    id: 'analise',
    label: 'Análise',
    items: [
      { to: '/comparacao', label: 'Comparação', icon: 'compare_arrows' },
      { to: '/metricas', label: 'Métricas', icon: 'insights' },
    ],
  },
  {
    id: 'plataforma',
    label: 'A plataforma',
    items: [
      { to: '/como-funciona', label: 'Como funciona', icon: 'help_outline' },
      { to: '/financiamento', label: 'Financiamento', icon: 'volunteer_activism' },
      { to: '/dados', label: 'Fontes de dados', icon: 'storage' },
      { to: '/porque', label: 'O porquê', icon: 'menu_book' },
      { to: '/sobre', label: 'Sobre', icon: 'info_outline' },
    ],
  },
  {
    id: 'legal',
    label: 'Legal e privacidade',
    items: [
      { to: '/cookies', label: 'Cookies', icon: 'cookie' },
      { to: '/direitos', label: 'Direitos RGPD', icon: 'policy' },
      { to: '/privacidade', label: 'Privacidade', icon: 'privacy_tip' },
      { to: '/termos', label: 'Termos de uso', icon: 'gavel' },
    ],
  },
]

/** Lista plana (mobile, active-check, exports legados) */
export const navMais = navMaisGroups.flatMap((g) => g.items)

/** Rodapé legal (RGPD) — mesma ordem A–Z do grupo legal */
export const navLegal = [
  { to: '/cookies', label: 'Cookies' },
  { to: '/direitos', label: 'Direitos RGPD' },
  { to: '/privacidade', label: 'Privacidade' },
  { to: '/termos', label: 'Termos de uso' },
]

export const navegacao = [...navPrincipal, ...navMais]
