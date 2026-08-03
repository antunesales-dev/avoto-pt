<template>
  <div class="page-shell">
    <h1 class="page-title">Privacidade</h1>
    <p class="page-subtitle">
      Resumo dos princípios de privacidade da A Voto. A política completa em pt-PT será publicada
      com o lançamento da autenticação. Conformidade com o RGPD.
    </p>

    <section class="av-card">
      <div class="av-card-pad prose">
        <h2 class="section-title">O que pedimos (em produção)</h2>
        <ul>
          <li><strong>Email</strong> — apenas para verificação de conta e recuperação.</li>
          <li><strong>Palavra-passe</strong> — armazenada como hash, nunca em texto claro.</li>
          <li>
            <strong>Partido de preferência (opcional)</strong> — nunca verificado, nunca cruzado
            com dados externos, nunca usado para identificar a pessoa na vida real.
          </li>
        </ul>

        <h3>O que não pedimos</h3>
        <ul>
          <li>NIF, Cartão de Cidadão, morada ou outros dados de identificação real obrigatória.</li>
        </ul>

        <h3>Votos</h3>
        <p>
          O voto fica associado ao <strong>ID de cidadão</strong> (ex.: CID-7K9M2X), não é
          publicamente ligado a email, nome ou outros dados pessoais. As métricas públicas são
          agregados — nunca o “quem votou o quê” de cada pessoa.
        </p>

        <h3>Transparência vs privacidade</h3>
        <p>
          Tornamos públicos os números de participação e as distribuições de voto. Não tornamos
          públicos os dados que permitem identificar utilizadores individuais.
        </p>

        <div class="notice notice-info">
          Com conta: email e votos associados ao ID de cidadão, guardados no Supabase com RLS.
          Agregados públicos não revelam o voto individual.
        </div>
      </div>
    </section>
  </div>
</template>
