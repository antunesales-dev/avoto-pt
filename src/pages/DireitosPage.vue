<template>
  <div class="page-shell legal-page">
    <h1 class="page-title">Os seus direitos (RGPD)</h1>
    <p class="page-subtitle">
      Como exercer os direitos previstos no RGPD relativamente aos dados pessoais tratados pela A
      Voto.
    </p>
    <p class="legal-meta">Última actualização: 4 de agosto de 2026</p>

    <nav class="legal-nav av-card av-card-pad" aria-label="Documentos legais">
      <router-link to="/privacidade">Privacidade</router-link>
      <router-link to="/termos">Termos de uso</router-link>
      <router-link to="/cookies">Cookies</router-link>
      <router-link to="/direitos" class="is-active">Os seus direitos (RGPD)</router-link>
    </nav>

    <section class="av-card">
      <div class="av-card-pad prose">
        <h2 class="section-title">1. Direitos que pode exercer</h2>
        <ul>
          <li>
            <strong>Acesso</strong> — saber se tratamos dados seus e obter cópia (art. 15.º).
          </li>
          <li>
            <strong>Rectificação</strong> — corrigir dados inexactos (art. 16.º), p.ex. email de
            conta quando o Auth o permitir.
          </li>
          <li>
            <strong>Apagamento</strong> (“direito a ser esquecido”) — nas condições do art. 17.º,
            incluindo pedido de eliminação de conta.
          </li>
          <li>
            <strong>Limitação do tratamento</strong> — art. 18.º, quando aplicável.
          </li>
          <li>
            <strong>Portabilidade</strong> — receber dados que nos forneceu num formato estruturado
            de uso corrente (art. 20.º), quando o tratamento se baseie em contrato ou consentimento e
            seja automatizado.
          </li>
          <li>
            <strong>Oposição</strong> — art. 21.º, em especial a tratamentos baseados em interesse
            legítimo (ex.: certas medidas de segurança desproporcionadas).
          </li>
          <li>
            <strong>Retirar consentimento</strong> — quando o tratamento se baseie em consentimento
            (ex.: notificações do browser), sem afectar a licitude anterior.
          </li>
          <li>
            <strong>Reclamação</strong> — junto da
            <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">CNPD</a>
            (art. 77.º).
          </li>
        </ul>

        <h2 class="section-title">2. O que pode fazer sozinho na plataforma</h2>
        <ul>
          <li>
            <strong>Perfil</strong> — ver o seu CID, email de conta e preferência partidária;
            actualizar a preferência; gerir preferências de notificação.
          </li>
          <li>
            <strong>Sair da conta</strong> — terminar a sessão no dispositivo.
          </li>
          <li>
            <strong>Browser</strong> — revogar permissão de notificações; limpar cookies e
            <code>localStorage</code>.
          </li>
        </ul>
        <p>
          Nota: os <strong>votos já confirmados</strong> são imutáveis por desenho do produto. O
          apagamento da conta e dos dados pessoais associados trata-se por pedido (secção 3), não
          pela alteração do sentido de voto histórico.
        </p>

        <h2 class="section-title">3. Como apresentar um pedido</h2>
        <p>Envie email para:</p>
        <p>
          <a class="btn btn--primary btn--sm" href="mailto:antunesales.developer@gmail.com?subject=Pedido%20RGPD%20A%20Voto"
            >antunesales.developer@gmail.com</a
          >
        </p>
        <p>Inclua, de preferência:</p>
        <ul>
          <li>Assunto: “Pedido RGPD — A Voto”</li>
          <li>Email da conta na plataforma</li>
          <li>CID (se souber), visível no perfil</li>
          <li>
            Tipo de pedido: acesso / rectificação / apagamento de conta / portabilidade / outro
          </li>
          <li>Descrição breve do pedido</li>
        </ul>
        <p>
          Podemos pedir informação adicional razoável para confirmar a identidade e evitar
          divulgação a terceiros.
        </p>

        <h2 class="section-title">4. Prazos de resposta</h2>
        <p>
          Em regra, responderemos no prazo de <strong>um mês</strong> a contar da recepção do
          pedido (art. 12.º, n.º 3, RGPD), podendo prorrogar-se por mais dois meses em casos
          complexos, com informação prévia dos motivos.
        </p>

        <h2 class="section-title">5. Autoridade de controlo</h2>
        <p>
          Comissão Nacional de Proteção de Dados (CNPD)<br />
          Av. D. Carlos I, 134, 1.º, 1200-651 Lisboa<br />
          <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>
        </p>

        <div class="notice notice-info">
          Política completa de tratamento:
          <router-link to="/privacidade">Política de Privacidade</router-link>. Condições do
          serviço: <router-link to="/termos">Termos de uso</router-link>.
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@import '@/css/legal.scss';
</style>
