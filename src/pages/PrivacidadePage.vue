<template>
  <div class="page-shell legal-page">
    <h1 class="page-title">Política de Privacidade</h1>
    <p class="page-subtitle">
      Informação sobre o tratamento de dados pessoais na plataforma A Voto — Bancada Cidadã, nos
      termos do Regulamento Geral sobre a Proteção de Dados (RGPD — Regulamento (UE) 2016/679) e da
      Lei n.º 58/2019, de 8 de agosto.
    </p>
    <p class="legal-meta">Última actualização: 4 de agosto de 2026</p>

    <nav class="legal-nav av-card av-card-pad" aria-label="Documentos legais">
      <router-link to="/privacidade" class="is-active">Privacidade</router-link>
      <router-link to="/termos">Termos de uso</router-link>
      <router-link to="/cookies">Cookies</router-link>
      <router-link to="/direitos">Os seus direitos (RGPD)</router-link>
    </nav>

    <section class="av-card">
      <div class="av-card-pad prose">
        <h2 class="section-title">1. Responsável pelo tratamento</h2>
        <p>
          O responsável pelo tratamento dos dados pessoais processados nesta plataforma é o
          mantenedor do projecto <strong>A Voto — Bancada Cidadã</strong> (software open source,
          independente, sem afiliação governamental).
        </p>
        <ul>
          <li>
            <strong>Contacto para privacidade / RGPD:</strong>
            <a href="mailto:antunesales.developer@gmail.com">antunesales.developer@gmail.com</a>
          </li>
          <li>
            <strong>Repositório:</strong>
            <a
              href="https://github.com/antunesales-dev/avoto-pt"
              target="_blank"
              rel="noopener noreferrer"
              >github.com/antunesales-dev/avoto-pt</a
            >
          </li>
          <li>
            <strong>Site:</strong> avoto.pt (quando activo) e ambientes técnicos de pré-produção
            (páginas Cloudflare / GitHub Pages).
          </li>
        </ul>

        <h2 class="section-title">2. Que dados tratamos</h2>
        <table class="legal-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Exemplos</th>
              <th>Finalidade</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Identificação de conta</td>
              <td>Endereço de email</td>
              <td>Criar e autenticar a conta; enviar link/código de acesso</td>
            </tr>
            <tr>
              <td>Credenciais</td>
              <td>Palavra-passe (opcional; apenas hash)</td>
              <td>Autenticação alternativa ao magic link</td>
            </tr>
            <tr>
              <td>Identificador de cidadão</td>
              <td>CID-… gerado pela plataforma</td>
              <td>Associar votos sem expor o email em métricas públicas</td>
            </tr>
            <tr>
              <td>Preferência partidária</td>
              <td>Texto livre opcional (encriptado)</td>
              <td>Comparação pessoal no perfil; nunca verificada externamente</td>
            </tr>
            <tr>
              <td>Votos</td>
              <td>Sentido do voto (favor / contra / abstenção), encriptado</td>
              <td>Registar a opinião na iniciativa ou investimento</td>
            </tr>
            <tr>
              <td>Dados técnicos de abuso</td>
              <td>Hash de IP, hash de device_id, contadores de pedidos</td>
              <td>Limitar spam e contas duplicadas (segurança)</td>
            </tr>
            <tr>
              <td>Anti-bot</td>
              <td>Token Cloudflare Turnstile</td>
              <td>Prevenir registos/automação abusiva</td>
            </tr>
            <tr>
              <td>Preferências de notificação</td>
              <td>Preferências de aviso (resumo do dia, iniciativas, etc.)</td>
              <td>Respeitar o que pretende ser notificado</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Não pedimos</strong> NIF, Cartão de Cidadão, morada, telefone, biometria ou outros
          dados de identificação civil obrigatória.
        </p>

        <h2 class="section-title">3. Fundamentos de licitude (art. 6.º RGPD)</h2>
        <ul>
          <li>
            <strong>Execução de contrato / medidas pré-contratuais</strong> — prestamos o serviço
            de conta e registo de votos que solicitou (art. 6.º, n.º 1, al. b)).
          </li>
          <li>
            <strong>Interesse legítimo</strong> — segurança da plataforma, prevenção de abuso e
            estatísticas agregadas de utilização (art. 6.º, n.º 1, al. f)), com salvaguardas de
            minimização e encriptação.
          </li>
          <li>
            <strong>Consentimento</strong> — quando aplicável a notificações do browser ou cookies
            não essenciais (art. 6.º, n.º 1, al. a)); pode retirar a qualquer momento.
          </li>
        </ul>

        <h2 class="section-title">4. Como protegemos os dados</h2>
        <ul>
          <li>Email gerido pelo <strong>Supabase Auth</strong> (acesso autenticado).</li>
          <li>
            Votos e preferência partidária <strong>encriptados na base de dados</strong> (AES via
            pgcrypto + chave no Vault); leitura do sentido do voto só pelo próprio utilizador
            autenticado (RPC).
          </li>
          <li>Políticas RLS (Row Level Security) na base de dados.</li>
          <li>Comunicações HTTPS; segregação de chaves (anon no browser, service role só no servidor).</li>
          <li>Rate limits e Turnstile para reduzir abuso.</li>
        </ul>

        <h2 class="section-title">5. Destinatários e subprocessadores</h2>
        <p>Podemos recorrer a prestadores que actuam sob instruções (art. 28.º RGPD), nomeadamente:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — autenticação e base de dados (região UE, p.ex. Frankfurt,
            quando configurado).
          </li>
          <li>
            <strong>Cloudflare</strong> — alojamento (Pages), rede de distribuição, Turnstile
            (anti-bot).
          </li>
          <li>
            <strong>GitHub Pages</strong> — ambiente de desenvolvimento/pré-visualização (código
            estático).
          </li>
        </ul>
        <p>
          Não vendemos dados pessoais. Não partilhamos o seu email ou votos individuais com
          partidos, meios de comunicação ou entidades públicas para fins de marketing ou perfilagem
          política.
        </p>

        <h2 class="section-title">6. Transferências internacionais</h2>
        <p>
          Procuramos alojar dados de conta e votos na <strong>União Europeia</strong>. Serviços de
          CDN ou anti-bot podem processar pedidos a partir de outras regiões; nesses casos aplicam-se
          as salvaguardas do prestador (cláusulas-tipo / framework aplicável) e apenas os dados
          técnicos necessários à prestação do serviço.
        </p>

        <h2 class="section-title">7. Prazos de conservação</h2>
        <ul>
          <li>
            <strong>Conta e email</strong> — enquanto a conta existir; pode pedir eliminação.
          </li>
          <li>
            <strong>Votos</strong> — enquanto a conta existir e o registo for necessário ao serviço
            (votos são imutáveis por desenho do produto; a eliminação da conta remove a associação
            pessoal conforme o modelo de dados e backups).
          </li>
          <li>
            <strong>Logs de rate limit / auditoria técnica</strong> — prazos curtos (da ordem de
            horas a dias), para segurança.
          </li>
          <li>
            <strong>Dados públicos oficiais</strong> (iniciativas AR, despesa, resumos do dia) — não são
            dados pessoais seus; conservam-se enquanto forem úteis à transparência.
          </li>
        </ul>

        <h2 class="section-title">8. Os seus direitos</h2>
        <p>
          Tem direito de acesso, rectificação, apagamento, limitação, portabilidade, oposição e a
          não ficar sujeito a decisões exclusivamente automatizadas com efeitos jurídicos
          significativos. Detalhe e forma de exercício:
          <router-link to="/direitos">Os seus direitos (RGPD)</router-link>.
        </p>
        <p>
          Pode apresentar reclamação à
          <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer"
            >Comissão Nacional de Proteção de Dados (CNPD)</a
          >.
        </p>

        <h2 class="section-title">9. Menores</h2>
        <p>
          A plataforma não se destina a menores de 16 anos sem o consentimento dos titulares das
          responsabilidades parentais, quando exigido pela lei portuguesa aplicável. Se tiver
          conhecimento de conta de menor sem base legal, contacte-nos para eliminação.
        </p>

        <h2 class="section-title">10. Alterações</h2>
        <p>
          Podemos actualizar esta política para reflectir mudanças legais ou técnicas. A data no
          topo indica a versão em vigor. Alterações relevantes serão assinaladas no site.
        </p>

        <div class="notice notice-info">
          Esta política descreve práticas reais do software open source A Voto. Não substitui
          aconselhamento jurídico formal se constituir uma entidade com obrigações adicionais.
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@import '@/css/legal.scss';
</style>
