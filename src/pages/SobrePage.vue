<template>
  <div class="page-shell">
    <h1 class="page-title">Sobre a A Voto</h1>
    <p class="page-subtitle">
      <strong>A Voto — Bancada Cidadã.</strong> O nome evoca o acto parlamentar de pôr uma matéria
      <em>a voto</em>. O slogan posiciona a plataforma como a “bancada” dos cidadãos registados —
      sem poder legal, sem enviesamento, só transparência.
    </p>

    <section class="av-card" style="margin-bottom: 1rem">
      <div class="av-card-pad prose">
        <h2 class="section-title">Missão</h2>
        <p>
          Mostrar, de forma transparente e sem enviesamento, se existe (ou não) desvio entre a
          vontade dos cidadãos que se deram ao trabalho de votar e o que cada partido realmente
          votou no Parlamento — para que as pessoas possam decidir de forma informada nas próximas
          eleições.
        </p>
        <div class="notice" style="margin: 1rem 0">
          <strong>A Voto não é um serviço do Estado.</strong> É um projecto cívico independente e
          open source. Usa dados públicos oficiais da Assembleia da República como fonte, sem
          representar o Governo, a AR ou qualquer instituição pública.
        </div>
        <h3>O problema</h3>
        <p>
          Muitos cidadãos sentem desconexão entre o voto nas legislativas e as decisões concretas
          no hemiciclo. As votações parlamentares são pouco transparentes no dia-a-dia, e não
          havia uma forma simples, contínua e neutra de comparar vontade cidadã com voto real dos
          partidos.
        </p>
        <p>
          Motivo de existir e limites do projecto:
          <router-link to="/porque">O porquê</router-link>.
        </p>
        <h3>Princípios não negociáveis</h3>
        <ul>
          <li>Open source total desde o primeiro dia</li>
          <li>Neutro e não enviesado — só fontes oficiais</li>
          <li>Voto único por indivíduo (ID único)</li>
          <li>Privacidade e RGPD (sem identificação real obrigatória)</li>
          <li>Transparência total de métricas</li>
        </ul>
      </div>
    </section>

    <section class="av-card">
      <div class="av-card-pad prose">
        <h2 class="section-title">O projecto hoje</h2>
        <p>
          A A Voto está <strong>disponível em
          <a href="https://avoto.pt" rel="noopener noreferrer">avoto.pt</a></strong>:
          podes registar-te, votar em iniciativas, comparar com os partidos, seguir o
          <router-link to="/digest">resumo do dia</router-link>, consultar
          <router-link to="/despesa">despesa pública</router-link> e
          <router-link to="/investimentos">investimentos</router-link>, e ver o
          <router-link to="/financiamento">financiamento transparente</router-link> do projecto.
        </p>
        <p>
          O código e a documentação técnica estão no repositório público (não na interface da app):
          <a
            href="https://github.com/antunesales-dev/avoto-pt"
            target="_blank"
            rel="noopener noreferrer"
            >github.com/antunesales-dev/avoto-pt ↗</a
          >.
        </p>
        <p>
          Critérios de dados e estado das importações:
          <router-link to="/dados">Fontes e dados</router-link>.
          Como usar a plataforma:
          <router-link to="/como-funciona">Como funciona</router-link>.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.prose {
  h3 {
    margin: 1.15rem 0 0.45rem;
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--pt-navy);
  }
  p,
  li {
    line-height: 1.5;
    color: var(--pt-ink);
  }
  ul {
    margin: 0.35rem 0 0;
    padding-left: 1.25rem;
  }
  a {
    font-weight: 700;
  }
}
</style>
