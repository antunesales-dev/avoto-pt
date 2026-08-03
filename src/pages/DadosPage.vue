<template>
  <div class="page-shell">
    <h1 class="page-title">Fontes de dados</h1>
    <p class="page-subtitle">
      A A Voto é independente do Estado. Para dados parlamentares, usa apenas fontes oficiais
      públicas (Dados Abertos) — como qualquer cidadão ou jornalista pode consultar. Se esses dados
      forem incompletos, a plataforma declara a limitação; não preenche lacunas com notícias, blogs
      ou wikis.
    </p>

    <section class="av-card" style="margin-bottom: 1rem">
      <div class="av-card-pad prose">
        <div class="notice" style="margin-bottom: 1rem">
          <strong>Fonte ≠ afiliação.</strong> Usar dados públicos da AR não torna a A Voto um site
          oficial, governamental ou parlamentar.
        </div>
        <h2 class="section-title">Fonte primária</h2>
        <p>
          <strong>Dados Abertos da Assembleia da República</strong> — formatos JSON e XML oficiais
          do Parlamento, em acesso livre.
        </p>
        <p>
          <a
            href="https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx"
            target="_blank"
            rel="noopener noreferrer"
          >
            parlamento.pt — Dados Abertos ↗
          </a>
        </p>
        <h3>O que entra na plataforma</h3>
        <ul>
          <li>Metadados e textos oficiais de iniciativas</li>
          <li>Resultados de votações por partido/bancada (e por deputado, quando existirem)</li>
          <li>Ligações e documentos no site da AR / Estado</li>
        </ul>
        <h3>O que fica de fora</h3>
        <ul>
          <li>Sites de notícias, blogs, wikis, APIs de terceiros, agregadores</li>
          <li>Resumos ou “explicações” baseadas em fontes não governamentais</li>
          <li>Qualquer conteúdo editorial ou de opinião política</li>
        </ul>
      </div>
    </section>

    <section class="av-card">
      <div class="av-card-pad">
        <h2 class="section-title">Nesta demonstração</h2>
        <p class="page-subtitle" style="margin-bottom: 0.75rem">
          Os registos de iniciativas e votos de cidadãos são <strong>simulados</strong> para
          permitir navegar o produto. Não representam votações reais da AR nem de utilizadores.
        </p>
        <div class="notice">
          Quando o importador oficial estiver ligado, cada página de iniciativa indicará a data de
          sincronização e qualquer limitação dos dados oficiais (por exemplo, votações unânimes
          com detalhe incompleto).
        </div>
      </div>
    </section>
  </div>
</template>
