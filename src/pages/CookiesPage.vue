<template>
  <div class="page-shell legal-page">
    <h1 class="page-title">Política de cookies</h1>
    <p class="page-subtitle">
      Informação sobre cookies e tecnologias similares usadas na A Voto, em linha com a ePrivacy e o
      RGPD.
    </p>
    <p class="legal-meta">Última actualização: 4 de agosto de 2026</p>

    <nav class="legal-nav av-card av-card-pad" aria-label="Documentos legais">
      <router-link to="/privacidade">Privacidade</router-link>
      <router-link to="/termos">Termos de uso</router-link>
      <router-link to="/cookies" class="is-active">Cookies</router-link>
      <router-link to="/direitos">Os seus direitos (RGPD)</router-link>
    </nav>

    <section class="av-card">
      <div class="av-card-pad prose">
        <h2 class="section-title">1. O que são cookies</h2>
        <p>
          Cookies são pequenos ficheiros guardados no seu dispositivo. Tecnologias similares incluem
          <code>localStorage</code>, session storage e identificadores de sessão geridos pelo
          browser.
        </p>

        <h2 class="section-title">2. O que usamos na A Voto</h2>
        <table class="legal-table">
          <thead>
            <tr>
              <th>Tecnologia</th>
              <th>Tipo</th>
              <th>Finalidade</th>
              <th>Duração</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sessão Supabase Auth (<code>avoto-auth</code>)</td>
              <td>Essencial</td>
              <td>Manter a sessão autenticada</td>
              <td>Até fim de sessão / renovação</td>
            </tr>
            <tr>
              <td><code>avoto-device-id</code> (localStorage)</td>
              <td>Essencial / segurança</td>
              <td>Limitar abuso e contas duplicadas no mesmo dispositivo</td>
              <td>Persistente até limpar dados do site</td>
            </tr>
            <tr>
              <td>Cloudflare Turnstile</td>
              <td>Segurança / anti-bot</td>
              <td>Verificar que o pedido de login não é automatizado</td>
              <td>Sessão / conforme Cloudflare</td>
            </tr>
            <tr>
              <td>Preferências de UI (se existirem)</td>
              <td>Funcional</td>
              <td>Lembrar escolhas da interface</td>
              <td>Variável</td>
            </tr>
            <tr>
              <td>Service Worker / cache PWA (produção)</td>
              <td>Funcional / desempenho</td>
              <td>App instalável e funcionamento offline limitado</td>
              <td>Até actualizar ou limpar</td>
            </tr>
          </tbody>
        </table>

        <h2 class="section-title">3. Cookies essenciais</h2>
        <p>
          Sem cookies e armazenamento essenciais de sessão e segurança, não é possível autenticar
          utilizadores nem proteger o serviço. Estes não requerem consentimento prévio nos termos
          habitualmente aplicados a cookies estritamente necessários ao serviço pedido pelo
          utilizador.
        </p>

        <h2 class="section-title">4. O que não usamos</h2>
        <ul>
          <li>Cookies de publicidade comportamental ou redes de anúncios próprias da A Voto.</li>
          <li>Pixel de redes sociais para remarketing.</li>
          <li>Ferramentas de analytics de terceiros com rastreio transversal (salvo menção futura
            explícita e, se aplicável, consentimento).</li>
        </ul>
        <p>
          Extensões do browser (ex.: scripts de terceiros injectados no cliente) não são controladas
          pela A Voto.
        </p>

        <h2 class="section-title">5. Como gerir</h2>
        <ul>
          <li>
            Pode limpar cookies e dados do site nas definições do browser (isso termina a sessão e
            gera novo <code>device-id</code>).
          </li>
          <li>
            Pode bloquear cookies de terceiros; se bloquear Turnstile, o login por email pode
            falhar.
          </li>
          <li>
            Em PWA, pode desinstalar a app / limpar o storage do site.
          </li>
        </ul>

        <h2 class="section-title">6. Mais informação</h2>
        <p>
          Sobre dados pessoais:
          <router-link to="/privacidade">Política de Privacidade</router-link>. Sobre direitos:
          <router-link to="/direitos">Os seus direitos (RGPD)</router-link>.
        </p>
        <p>
          Contacto:
          <a href="mailto:antunesales.developer@gmail.com">antunesales.developer@gmail.com</a>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@import '@/css/legal.scss';
</style>
