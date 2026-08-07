<template>
  <div class="page-shell">
    <h1 class="page-title">Financiamento</h1>
    <p class="page-subtitle">
      A A Voto é independente. As doações servem para
      <strong>manter o site a funcionar</strong> e para
      <strong>pagar o trabalho</strong> de quem o desenvolve e cuida — tudo registado em público.
      Doar <strong>não compra</strong> influência política nem privilégios.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      Na lista de doações só aparece o <strong>valor</strong>, a <strong>data</strong> e se foi
      <strong>anónimo</strong> ou com o teu identificador de cidadão (se escolheres). Nunca
      mostramos email nem dados bancários.
    </div>

    <!-- Modelo -->
    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad">
        <h2 class="section-title">Como o dinheiro é usado</h2>
        <ul class="model-list">
          <li>
            <strong>Custos do site</strong> — domínio, servidores, envio de emails e serviços
            necessários para a plataforma existir.
          </li>
          <li>
            <strong>Trabalho de manutenção</strong> — tempo de quem programa, actualiza dados e
            resolve problemas (não é patrocínio de partidos).
          </li>
        </ul>
        <p class="muted">
          O código é aberto:
          <a
            href="https://github.com/antunesales-dev/avoto-pt"
            target="_blank"
            rel="noopener noreferrer"
            >ver no GitHub ↗</a
          >.
        </p>
      </div>
    </section>

    <!-- CTA -->
    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad cta">
        <h2 class="section-title">Apoiar</h2>
        <p class="muted" style="margin-top: -0.25rem">
          Qualquer pessoa pode apoiar — não é preciso ter conta. O pagamento abre noutro ecrã
          (cartão ou MB WAY, quando disponível). Não pedimos nem mostramos o teu IBAN ou telemóvel.
        </p>
        <a
          v-if="finance.canDonate"
          class="btn btn--primary btn--lg"
          :href="donateHref"
          target="_blank"
          rel="noopener noreferrer"
        >
          Quero apoiar
        </a>
        <button
          v-else
          type="button"
          class="btn btn--primary btn--lg"
          disabled
        >
          Quero apoiar
        </button>
        <p v-if="!finance.canDonate && !finance.loading" class="muted sm" style="margin: 0">
          O pagamento ainda está a ser preparado. Volta em breve.
        </p>
        <label v-if="auth.isLoggedIn && auth.cid && finance.canDonate" class="toggle publish-cid">
          <input v-model="publishCid" type="checkbox" />
          <span>
            Mostrar o meu ID de cidadão (<strong>{{ auth.cid }}</strong>) na lista de doações
            (opcional; por omissão fica anónimo)
          </span>
        </label>
      </div>
    </section>

    <!-- Resumo + doações -->
    <section class="av-card">
      <div class="av-card-pad">
        <h2 class="section-title">Doações</h2>
        <p v-if="finance.loading" class="muted">A carregar…</p>
        <p v-else-if="finance.error" class="err">{{ finance.error }}</p>
        <template v-else>
          <div class="stats-grid">
            <div class="stat-mini">
              <div class="stat-mini__l">Total recebido</div>
              <div class="stat-mini__v font-display">{{ formatMoney(r.total_in) }}</div>
            </div>
            <div class="stat-mini">
              <div class="stat-mini__l">N.º de doações</div>
              <div class="stat-mini__v font-display">{{ r.n_donations }}</div>
            </div>
          </div>
          <p class="muted sm" style="margin-top: 1rem">
            Lista pública: quanto, quando e se foi anónimo ou com ID de cidadão.
          </p>
          <div v-if="!finance.donations.length" class="empty">
            Ainda não há doações registadas.
          </div>
          <div v-else class="av-table-wrap">
            <table class="av-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Quem</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in finance.donations" :key="d.id">
                  <td>{{ formatDate(d.donated_on) }}</td>
                  <td>
                    <span class="tag">{{ d.display_tag || 'Anónimo' }}</span>
                  </td>
                  <td class="num">{{ formatMoney(d.amount_eur) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { formatDate } from '@/data/partidos'
import { useAuthStore } from '@/stores/auth'
import { useFinancePublicStore } from '@/stores/financePublic'

const auth = useAuthStore()
const finance = useFinancePublicStore()
const publishCid = ref(false)

const r = computed(() => finance.resumo)

/** Stripe Payment Links aceitam ?client_reference_id= e prefilled_email; metadata via dashboard.
 *  Passamos client_reference_id com CID para o webhook poder mapear (se configurado). */
const donateHref = computed(() => {
  const base = finance.paymentLink
  if (!base) return '#'
  try {
    const u = new URL(base)
    if (publishCid.value && auth.cid) {
      u.searchParams.set('client_reference_id', auth.cid)
    }
    return u.toString()
  } catch {
    return base
  }
})

function formatMoney(n) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)
}

onMounted(() => {
  finance.load().catch(console.error)
})
</script>

<style scoped lang="scss">
.model-list {
  margin: 0 0 0.85rem;
  padding-left: 1.2rem;
  line-height: 1.5;
}
.muted {
  color: var(--pt-muted);
  font-size: 0.92rem;
  line-height: 1.45;
  &.sm {
    font-size: 0.85rem;
    margin: -0.35rem 0 0.75rem;
  }
}
.err {
  color: var(--pt-red);
  font-weight: 600;
}
.cta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}
.btn--lg {
  font-size: 1rem;
  padding: 0.7rem 1.35rem;
}
.btn--primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.cid-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--pt-muted);
  code {
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }
}
.publish-cid {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  input {
    margin-top: 0.2rem;
  }
}
.stats-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr 1fr;
  max-width: 28rem;
}
.stat-mini__l {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pt-muted);
}
.stat-mini__v {
  font-size: 1.25rem;
  margin-top: 0.2rem;
  color: var(--pt-navy);
}
.empty {
  color: var(--pt-muted);
  font-weight: 600;
  padding: 0.5rem 0;
}
.tag {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
}
.num {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  white-space: nowrap;
}
</style>
