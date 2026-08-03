<template>
  <div class="page-shell">
    <h1 class="page-title">Como funciona</h1>
    <p class="page-subtitle">
      A Voto é simples de propósito: registar, votar uma vez por iniciativa, e ver a comparação com
      o Parlamento — sem ruído.
    </p>

    <div class="steps">
      <article v-for="(s, i) in passos" :key="s.t" class="av-card step">
        <div class="flag-stripe" aria-hidden="true">
          <span class="flag-stripe__green" />
          <span class="flag-stripe__red" />
        </div>
        <div class="av-card-pad">
          <div class="step__n">{{ String(i + 1).padStart(2, '0') }}</div>
          <h2>{{ s.t }}</h2>
          <p>{{ s.d }}</p>
        </div>
      </article>
    </div>

    <section class="av-card" style="margin-top: 1.25rem">
      <div class="av-card-pad prose">
        <h2 class="section-title">O que pode e não pode esperar</h2>
        <h3>É</h3>
        <ul>
          <li>Uma ferramenta de transparência e comparação factual.</li>
          <li>A opinião agregada de quem se registou e votou — não uma amostra estatística da população.</li>
          <li>Open source e auditável.</li>
        </ul>
        <h3>Não é</h3>
        <ul>
          <li>Democracia directa nem voto vinculativo.</li>
          <li>Sondagem oficial ou representativa de Portugal.</li>
          <li>Um sítio de recomendações políticas ou de “vencedores”.</li>
        </ul>
        <div class="notice" style="margin-top: 1rem">
          Nesta build de demonstração o registo e a votação estão desactivados — apenas navegação e
          visualização.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const passos = [
  {
    t: 'Regista-se e recebe um ID',
    d: 'Email verificado, ID único permanente (ex.: CID-7K9M2X). Sem NIF nem Cartão de Cidadão. O email serve para conta e recuperação.',
  },
  {
    t: 'Vota uma vez por iniciativa',
    d: 'A favor, Contra ou Abstenção — o mesmo leque do hemiciclo. Um único voto por ID em cada item.',
  },
  {
    t: 'Vê a comparação',
    d: 'Imediatamente: agregados dos cidadãos, voto de cada partido na AR, alinhamento e métricas de participação.',
  },
  {
    t: 'Usa a informação como quiser',
    d: 'Para reflectir sobre a qualidade da representação e, se o desejar, informar o voto nas próximas eleições. A plataforma não decide por si.',
  },
]
</script>

<style scoped lang="scss">
.steps {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.step {
  h2 {
    font-family: var(--font-display);
    font-size: 1.35rem;
    margin: 0.35rem 0 0.5rem;
    color: var(--pt-navy);
  }

  p {
    margin: 0;
    color: var(--pt-muted);
    line-height: 1.5;
  }
}

.step__n {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(90deg, var(--pt-green), var(--pt-red));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
}
</style>
