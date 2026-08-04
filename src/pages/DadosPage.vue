<template>
  <div class="page-shell">
    <h1 class="page-title">Fontes de dados</h1>
    <p class="page-subtitle">
      A A Voto é independente do Estado. Para dados parlamentares e de despesa usa
      <strong>apenas fontes oficiais públicas</strong> — como qualquer cidadão ou jornalista pode
      consultar. Se forem incompletas, a plataforma
      <strong>declara a limitação</strong>; não preenche lacunas com notícias, blogs ou wikis.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      <strong>Fonte ≠ afiliação.</strong> Usar dados públicos da AR ou do Portal Base não torna a
      A Voto um site oficial, governamental ou parlamentar. Ver também
      <router-link to="/como-funciona">Como funciona</router-link>
      e
      <router-link to="/metricas">Métricas</router-link>
      (contagens públicas).
    </div>

    <!-- Estado vivo dos syncs -->
    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad">
        <h2 class="section-title">Estado das importações (ao vivo)</h2>
        <SyncStatusPanel />
      </div>
    </section>

    <!-- Critérios de data — transparência do resumo -->
    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad prose">
        <h2 class="section-title">Que data conta onde?</h2>
        <p>
          Evita confusão entre “quando o sistema importou” e “quando o acto oficial aconteceu”:
        </p>
        <div class="av-table-wrap">
          <table class="av-table">
            <thead>
              <tr>
                <th>Secção</th>
                <th>Data oficial usada</th>
                <th>Não usamos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><router-link to="/iniciativas">Iniciativas</router-link> / resumo (leis)</td>
                <td><code>data_votacao</code> (AR)</td>
                <td>Data do sync</td>
              </tr>
              <tr>
                <td><router-link to="/despesa">Despesa</router-link> / resumo (contratos)</td>
                <td><code>data_publicacao</code> (Portal Base)</td>
                <td>Data do sync</td>
              </tr>
              <tr>
                <td><router-link to="/investimentos">Investimentos</router-link></td>
                <td><code>data_referencia</code> (= publicação Base, ≥100k&nbsp;€)</td>
                <td>Data do sync</td>
              </tr>
              <tr>
                <td><router-link to="/digest">Resumo do dia</router-link></td>
                <td>Só itens com data oficial = dia do boletim</td>
                <td>
                  “Tudo o que importámos hoje” (isso enchia o boletim com contratos antigos)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="muted" style="margin-top: 0.75rem">
          Despesa e investimentos <strong>não são duas fontes</strong>: o sync Base grava o
          catálogo em Despesa e copia os ≥&nbsp;100&nbsp;000&nbsp;€ para Investimentos (voto
          cidadão).
        </p>
      </div>
    </section>

    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad prose">
        <h2 class="section-title">Fontes primárias</h2>
        <ul>
          <li>
            <strong>Parlamento / votações:</strong>
            <a
              href="https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx"
              target="_blank"
              rel="noopener noreferrer"
              >Dados Abertos da AR ↗</a
            >
          </li>
          <li>
            <strong>Contratos e despesa:</strong>
            <a href="https://www.base.gov.pt" target="_blank" rel="noopener noreferrer"
              >Base.gov.pt ↗</a
            >
            ·
            <a href="https://dados.gov.pt" target="_blank" rel="noopener noreferrer"
              >dados.gov.pt ↗</a
            >
            · espelho open data
            <a
              href="https://transparencia.sns.gov.pt/explore/dataset/portal-base/"
              target="_blank"
              rel="noopener noreferrer"
              >SNS Transparência (Portal Base) ↗</a
            >
          </li>
          <li>
            <strong>Orçamento (referência):</strong>
            <a href="https://www.dgo.gov.pt" target="_blank" rel="noopener noreferrer">DGO ↗</a>
          </li>
        </ul>

        <h3>O que entra na plataforma</h3>
        <ul>
          <li>Metadados e textos oficiais de iniciativas</li>
          <li>Resultados de votações por partido/bancada (quando o registo AR os tem)</li>
          <li>Contratos públicos com montante, entidade, datas e ligações oficiais</li>
          <li>Ligações e documentos nos portais do Estado / AR</li>
        </ul>

        <h3>O que fica de fora</h3>
        <ul>
          <li>Sites de notícias, blogs, wikis, APIs de terceiros não oficiais, agregadores</li>
          <li>Resumos ou “explicações” baseadas em fontes não governamentais</li>
          <li>Conteúdo editorial ou de opinião política</li>
          <li>Dados de demonstração (“seed”) em produção</li>
        </ul>

        <h3>Ordem e peso dos partidos</h3>
        <p>
          <strong>Ordem alfabética da sigla</strong> nas listas (anti-enviesamento). No detalhe de
          cada iniciativa, o <strong>peso da bancada</strong> (assentos) mostra a aritmética a
          favor / contra / abstenção no hemiciclo — não é ranking nem recomendação. Ver
          <router-link to="/como-funciona">Como funciona</router-link>.
        </p>

        <h3>Votos de cidadãos</h3>
        <p>
          São da própria A Voto (contas autenticadas, um voto por item, definitivo). Agregados
          públicos sem dados pessoais. Não representam a população — só quem se registou e votou
          aqui.
        </p>
      </div>
    </section>

    <section class="av-card">
      <div class="av-card-pad">
        <h2 class="section-title">Jobs técnicos</h2>
        <p class="muted" style="margin: 0 0 0.65rem">
          Nomes internos dos processos diários (também em
          <code>docs/GOV-DATA.md</code> no repositório):
        </p>
        <ul class="jobs">
          <li><code>ar-sync</code> — Dados Abertos AR → iniciativas</li>
          <li><code>despesa-sync</code> — Portal Base → despesas + investimentos ≥100k</li>
          <li><code>daily-digest</code> — boletim por data oficial (não por data de sync)</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup>
import SyncStatusPanel from '@/components/SyncStatusPanel.vue'
</script>

<style scoped lang="scss">
.prose {
  p,
  li {
    line-height: 1.5;
  }
  ul {
    margin: 0.5rem 0 1rem;
    padding-left: 1.25rem;
  }
  h3 {
    margin: 1.15rem 0 0.45rem;
    font-size: 1rem;
  }
}
.muted {
  color: var(--pt-muted);
  font-size: 0.92rem;
}
.jobs {
  margin: 0;
  padding-left: 1.2rem;
  li {
    margin-bottom: 0.35rem;
    font-size: 0.92rem;
  }
  code {
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }
}
</style>
