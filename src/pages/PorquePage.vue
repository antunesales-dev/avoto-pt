<template>
  <div class="page-shell">
    <h1 class="page-title">O porquê</h1>
    <p class="page-subtitle">
      O que me levou a criar a A Voto — contado de forma simples, sem jargão e sem lado
      político.
    </p>

    <section class="av-card letter" style="margin-bottom: 1rem">
      <div class="flag-stripe" aria-hidden="true">
        <span class="flag-stripe__green" />
        <span class="flag-stripe__red" />
      </div>
      <div class="av-card-pad prose">
        <p class="lead">
          Chamo-me <strong>Tiago Sales</strong>. A A Voto nasceu de uma frustração muito concreta:
          eu não conseguia acompanhar o que se discutia e se votava no Parlamento — nem perceber,
          com clareza, o que o Governo e os partidos estavam a fazer em nome dos cidadãos.
        </p>

        <h2 class="section-title">O que sentia</h2>
        <p>
          As medidas sucediam-se. As notícias falavam em siglas, números de projectos de lei e
          debates que eu não conseguia seguir até ao fim. Queria saber, em linguagem básica:
        </p>
        <ul>
          <li><strong>O que</strong> está a ser discutido?</li>
          <li><strong>O que</strong> está a ser votado?</li>
          <li><strong>Como</strong> votou cada partido?</li>
          <li>E <strong>eu</strong>, se pudesse opinar, estaria a favor, contra ou abster-me-ia?</li>
        </ul>
        <p>
          Sem isso, o sentido do que se passava no hemiciclo ficava longe. Não era falta de
          interesse — era falta de uma forma simples de acompanhar e de comparar.
        </p>

        <h2 class="section-title">A ideia</h2>
        <p>
          Imaginei uma estrutura em que o povo também pudesse votar — não para substituir o
          Parlamento, mas para tornar visível a vontade de quem se dá ao trabalho de participar.
          Que esse voto cidadão tivesse <em>visibilidade</em> e <em>peso informativo</em> ao lado
          do voto dos partidos eleitos: lado a lado, sem filtros, sem “quem ganhou o debate”.
        </p>
        <p>
          Se os partidos representam os cidadãos, faz sentido poder ver, iniciativa a iniciativa,
          se essa representação se aproxima ou se afasta de quem votou na plataforma. Não como
          sentença. Como informação.
        </p>

        <h2 class="section-title">O que isto não é</h2>
        <p>
          A A Voto <strong>não é sobre esquerda ou direita</strong>. Não é um manifesto de
          políticas “certas” ou “erradas”. Não escolhe partidos, não recomenda votos e não
          pretende dizer-lhe o que pensar.
        </p>
        <p>
          Trata-se de <strong>entender</strong> — com palavras simples — o que se discute, o que se
          vota, e como o voto no Parlamento se compara com o voto de cidadãos registados. Ponto.
        </p>

        <h2 class="section-title">O que quero que consiga fazer</h2>
        <ol>
          <li>Abrir uma iniciativa e perceber o essencial, sem precisar de ser jurista.</li>
          <li>Registar o seu voto uma vez (a favor, contra ou abstenção).</li>
          <li>Ver de imediato o que os partidos votaram na Assembleia da República.</li>
          <li>Usar essa comparação como quiser — inclusive no dia das eleições.</li>
        </ol>
        <p>
          Se eu, como cidadão, não conseguia seguir o fio, outros também não. A A Voto existe para
          encurtar essa distância: transparência, linguagem clara, e a bancada cidadã ao lado da
          bancada parlamentar — para que o desvio, quando existe, se veja à luz do dia.
        </p>

        <p class="signoff">
          — Tiago Sales<br />
          <span class="signoff__meta">Fundador · A Voto — Bancada Cidadã</span>
        </p>
      </div>
    </section>

    <section class="av-card">
      <div class="av-card-pad cta">
        <p class="cta__text">Quer ver como funciona na prática?</p>
        <div class="cta__actions">
          <router-link to="/como-funciona" class="btn btn--primary">Como funciona</router-link>
          <router-link to="/iniciativas" class="btn btn--outline">Ver iniciativas</router-link>
          <router-link to="/sobre" class="btn btn--ghost">Sobre a plataforma</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.letter {
  .lead {
    font-size: 1.05rem;
    line-height: 1.65;
    color: var(--pt-ink);
    margin-top: 0;
  }

  .prose {
    p {
      margin: 0 0 1rem;
      color: var(--pt-ink);
      line-height: 1.65;
    }

    ul,
    ol {
      margin: 0 0 1rem;
      padding-left: 1.25rem;
      color: var(--pt-ink);
      line-height: 1.65;

      li {
        margin-bottom: 0.35rem;
      }
    }

    h2 {
      margin-top: 1.75rem;
    }
  }
}

.signoff {
  margin: 1.75rem 0 0 !important;
  padding-top: 1.25rem;
  border-top: 1px solid var(--pt-line);
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--pt-navy);
  line-height: 1.45;

  &__meta {
    font-family: var(--font-body);
    font-size: 0.88rem;
    color: var(--pt-muted);
  }
}

.cta {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  &__text {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.1rem;
    color: var(--pt-navy);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
