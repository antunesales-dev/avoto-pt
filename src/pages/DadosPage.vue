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
        <h2 class="section-title">Fontes primárias</h2>
        <ul>
          <li>
            <strong>Parlamento / votações:</strong>
            <a href="https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx" target="_blank" rel="noopener noreferrer">Dados Abertos da AR</a>
          </li>
          <li>
            <strong>Contratos e despesa:</strong>
            <a href="https://www.base.gov.pt" target="_blank" rel="noopener noreferrer">Base.gov.pt</a>
            ·
            <a href="https://dados.gov.pt" target="_blank" rel="noopener noreferrer">dados.gov.pt</a>
          </li>
          <li>
            <strong>Orçamento:</strong>
            <a href="https://www.dgo.gov.pt" target="_blank" rel="noopener noreferrer">DGO</a>
          </li>
        </ul>
        <p>
          Jobs diários planeados: <code>ar-sync</code>, <code>daily-digest</code>,
          <code>despesa-sync</code> (ver <code>docs/GOV-DATA.md</code>).
        </p>
        <h2 class="section-title">Fonte primária (AR)</h2>
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
        <h2 class="section-title">Estado dos dados</h2>
        <p class="page-subtitle" style="margin-bottom: 0.75rem">
          Votos de cidadãos na plataforma são reais (contas Supabase). Iniciativas, despesa e
          investimentos com <code>source=seed</code> são estrutura de demonstração até os jobs
          oficiais (<code>ar-sync</code>, <code>despesa-sync</code>) preencherem a base.
        </p>
        <div class="notice">
          Cada registo deve indicar a fonte. Lacunas dos dados oficiais são declaradas — nunca
          preenchidas com notícias ou wikis.
        </div>
      </div>
    </section>
  </div>
</template>
