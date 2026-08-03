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
      <div class="av-card-pad">
        <h2 class="section-title">Stack tecnológica</h2>
        <div class="av-table-wrap" style="border: none">
          <table class="av-table">
            <tbody>
              <tr>
                <th>Frontend</th>
                <td>Vue 3 · Vite · Quasar · Pinia · Zod</td>
              </tr>
              <tr>
                <th>Backend</th>
                <td>Supabase (Auth, PostgreSQL, RLS) — fase seguinte</td>
              </tr>
              <tr>
                <th>Edge / hosting</th>
                <td>Cloudflare Pages / Workers — fase seguinte</td>
              </tr>
              <tr>
                <th>Locale</th>
                <td>Português de Portugal (pt-PT)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="page-subtitle" style="margin: 1rem 0 0">
          Domínio previsto:
          <a href="https://avoto.pt" target="_blank" rel="noopener noreferrer">avoto.pt</a>
        </p>
      </div>
    </section>
  </div>
</template>
