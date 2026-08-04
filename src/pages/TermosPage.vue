<template>
  <div class="page-shell legal-page">
    <h1 class="page-title">Termos de uso</h1>
    <p class="page-subtitle">
      Condições de utilização da plataforma A Voto — Bancada Cidadã. Ao criar conta ou usar o
      serviço, aceita estes termos.
    </p>
    <p class="legal-meta">Última actualização: 4 de agosto de 2026</p>

    <nav class="legal-nav av-card av-card-pad" aria-label="Documentos legais">
      <router-link to="/privacidade">Privacidade</router-link>
      <router-link to="/termos" class="is-active">Termos de uso</router-link>
      <router-link to="/cookies">Cookies</router-link>
      <router-link to="/direitos">Os seus direitos (RGPD)</router-link>
    </nav>

    <section class="av-card">
      <div class="av-card-pad prose">
        <h2 class="section-title">1. Objecto e natureza do serviço</h2>
        <p>
          A Voto é uma plataforma cívica <strong>independente</strong>, open source e sem afiliação
          ao Estado português, a partidos ou a órgãos de soberania. Permite a cidadãos registados
          exprimir um sentido de voto em iniciativas e investimentos e comparar agregados com
          registos oficiais (Assembleia da República, portais de despesa pública, etc.).
        </p>
        <p>
          <strong>Não é</strong> um acto eleitoral, referendo, consulta pública vinculativa nem
          instrumento de “controlo do Governo”. Os votos na A Voto têm valor <em>informativo e
          cívico</em>, não jurídico.
        </p>

        <h2 class="section-title">2. Elegibilidade e conta</h2>
        <ul>
          <li>Deve fornecer um email válido e verdadeiro.</li>
          <li>Uma pessoa / intenção de uso legítimo por conta; proíbe-se a criação massiva de contas.</li>
          <li>
            Aplicamos limites técnicos (dispositivo, IP, Turnstile) para reduzir abuso — ver
            <router-link to="/privacidade">Política de Privacidade</router-link>.
          </li>
          <li>É responsável pela confidencialidade do acesso à sua conta (email e códigos).</li>
        </ul>

        <h2 class="section-title">3. Votos na plataforma</h2>
        <ul>
          <li>
            <strong>Um voto por conta por iniciativa ou investimento</strong>, após confirmação.
          </li>
          <li>
            Os votos são <strong>imutáveis</strong> por desenho do produto (transparência e
            integridade do registo).
          </li>
          <li>Não utilize a plataforma para assédio, spam, fraude ou manipulação automatizada.</li>
          <li>
            Métricas e digests públicos mostram <strong>agregados</strong>, não a identidade de
            quem votou o quê.
          </li>
        </ul>

        <h2 class="section-title">4. Conteúdos e fontes oficiais</h2>
        <p>
          Textos sobre iniciativas, despesa e investimentos provêm de
          <strong>fontes oficiais</strong> ou de sincronizações a partir delas. Podem existir
          atrasos, lacunas ou erros de mapeamento. A A Voto não garante exaustividade nem
          actualização em tempo real do Parlamento ou da Administração.
        </p>
        <p>
          É proibido apresentar a A Voto como sítio oficial do Estado ou da Assembleia da República.
        </p>

        <h2 class="section-title">5. Conduta proibida</h2>
        <ul>
          <li>Tentar contornar rate limits, captchas ou controlos de segurança.</li>
          <li>Recolher dados de outros utilizadores ou tentar reidentificar votos.</li>
          <li>Usar a marca ou o conteúdo de forma enganosa.</li>
          <li>Atacar, sobrecarregar ou explorar vulnerabilidades do serviço.</li>
        </ul>

        <h2 class="section-title">6. Propriedade intelectual e open source</h2>
        <p>
          O código da A Voto é disponibilizado sob a licença <strong>AGPL-3.0</strong> (ver
          repositório). Os dados oficiais permanecem sujeitos às licenças e termos dos respetivos
          portais do Estado / AR. A marca e textos originais da interface destinam-se ao projecto
          cívico A Voto.
        </p>

        <h2 class="section-title">7. Disponibilidade e isenção de garantia</h2>
        <p>
          O serviço é prestado “tal como está”, no âmbito de um projecto independente. Podemos
          suspender, alterar ou descontinuar funcionalidades. Não nos responsabilizamos por danos
          indirectos decorrentes do uso ou da impossibilidade de uso, na medida permitida pela lei
          imperativa portuguesa e europeia de proteção do consumidor.
        </p>

        <h2 class="section-title">8. Suspensão e encerramento</h2>
        <p>
          Podemos suspender ou encerrar contas que violem estes termos, abusem do sistema ou
          comprometam a segurança de outros. Pode pedir o encerramento da conta e o exercício de
          direitos RGPD conforme a
          <router-link to="/privacidade">Política de Privacidade</router-link> e a página
          <router-link to="/direitos">Os seus direitos</router-link>.
        </p>

        <h2 class="section-title">9. Lei aplicável</h2>
        <p>
          Estes termos regem-se pela lei portuguesa. Em caso de litígio, e sem prejuízo de direitos
          imperativos do consumidor, são competentes os tribunais portugueses da comarca do
          responsável pelo tratamento, salvo norma especial.
        </p>

        <h2 class="section-title">10. Contacto</h2>
        <p>
          Questões sobre estes termos:
          <a href="mailto:antunesales.developer@gmail.com">antunesales.developer@gmail.com</a>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@import '@/css/legal.scss';
</style>
