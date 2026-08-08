<template>
  <div class="page-shell">
    <h1 class="page-title">O porquê</h1>
    <p class="page-subtitle">
      Motivo de existir a A Voto — curto e objectivo. Sem manifesto e sem lado político.
    </p>

    <section class="av-card" style="margin-bottom: 1rem">
      <div class="av-card-pad prose">
        <h2 class="section-title">Problema</h2>
        <p>
          As votações na Assembleia da República são públicas, mas difíceis de acompanhar no
          dia-a-dia: muitos textos oficiais, pouco resumo útil e quase nenhuma forma simples de
          ver, lado a lado, o que cada partido votou.
        </p>
        <p>Em prática, falta resposta rápida a quatro perguntas:</p>
        <ul>
          <li>O que está a ser discutido ou votado?</li>
          <li>Como votou cada partido?</li>
          <li>Como votam os cidadãos que se registam aqui?</li>
          <li>Há (ou não) desvio entre uns e outros?</li>
        </ul>

        <h2 class="section-title">Resposta</h2>
        <p>
          A A Voto junta <strong>dados oficiais</strong> (AR e portais de despesa) com
          <strong>votos de cidadãos registados</strong> — um por pessoa e por iniciativa, imutável
          depois de confirmado. O resultado é comparação factual, não opinião da plataforma.
        </p>
        <p>
          Não substitui o Parlamento. Não é referendo. Não recomenda partidos. Serve para
          <strong>ver</strong> e, se quiser, decidir melhor nas eleições.
        </p>

        <h2 class="section-title">Limites (de propósito)</h2>
        <ul>
          <li>Não é amostra representativa da população portuguesa.</li>
          <li>Não inventa dados: se a fonte oficial falha, a lacuna fica à vista.</li>
          <li>Não é sítio do Estado nem afiliada a partidos.</li>
          <li>Open source: o código e as regras são auditáveis.</li>
        </ul>

        <h2 class="section-title">Quem mantém</h2>
        <p>
          Projecto independente mantido por <strong>Tiago Sales</strong>. Contacto e repositório
          estão nas páginas
          <router-link to="/sobre">Sobre</router-link>
          e
          <router-link to="/privacidade">Privacidade</router-link>.
        </p>
      </div>
    </section>

    <section class="av-card">
      <div class="av-card-pad cta">
        <p class="cta__text">Seguinte passo</p>
        <div class="cta__actions">
          <router-link to="/como-funciona" class="btn btn--primary">Como funciona</router-link>
          <router-link to="/iniciativas" class="btn btn--outline">Iniciativas</router-link>
          <router-link to="/sobre" class="btn btn--ghost">Sobre</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.prose {
  p {
    margin: 0 0 1rem;
    color: var(--pt-ink);
    line-height: 1.55;
  }

  ul {
    margin: 0 0 1rem;
    padding-left: 1.25rem;
    color: var(--pt-ink);
    line-height: 1.55;

    li {
      margin-bottom: 0.3rem;
    }
  }

  h2 {
    margin-top: 1.5rem;
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
    font-weight: 700;
    color: var(--pt-navy);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
