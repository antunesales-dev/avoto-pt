<template>
  <div class="page-shell">
    <h1 class="page-title">Financiamento</h1>
    <p class="page-subtitle">
      A A Voto é independente e open source. Doações pagam
      <strong>infraestrutura</strong> (domínio, base de dados, email…) e o
      <strong>trabalho de manutenção</strong> (código, ops, suporte) — de forma
      <strong>pública e legível</strong>. Ninguém compra ranking, votos ou enviesamento.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      <strong>O que vês no ledger:</strong> valor, data e etiqueta
      (<code>CID-…</code> se o doador quiser, ou <strong>Anónimo</strong>). Nunca email, IBAN nem
      telefone. Pagamentos via <strong>Stripe</strong> (incl. MB WAY no checkout) — os teus dados
      bancários não estão nesta página.
    </div>

    <!-- Modelo -->
    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad">
        <h2 class="section-title">Como o dinheiro é usado</h2>
        <ul class="model-list">
          <li>
            <strong>Infra</strong> — custos de correr a plataforma (Supabase, domínio, SMTP, etc.).
          </li>
          <li>
            <strong>Maintainer</strong> — remuneração do trabalho de quem desenvolve e opera o
            projecto (não é “patrocínio político”).
          </li>
        </ul>
        <p class="muted">
          Doações não dão direito a decisões editoriais, prioridade em features, nem influência
          sobre o tratamento de partidos ou dados oficiais. Código:
          <a
            href="https://github.com/antunesales-dev/avoto-pt"
            target="_blank"
            rel="noopener noreferrer"
            >repositório open source ↗</a
          >.
        </p>
      </div>
    </section>

    <!-- CTA -->
    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad cta">
        <h2 class="section-title">Apoiar</h2>
        <p class="muted" style="margin-top: -0.25rem">
          Stripe Checkout — cartão e, se estiver activo na tua conta Stripe,
          <strong>MB WAY</strong>. Não publicamos o teu IBAN nem telefone.
        </p>
        <a
          v-if="finance.paymentLink"
          class="btn btn--primary"
          :href="donateHref"
          target="_blank"
          rel="noopener noreferrer"
        >
          Doar com Stripe
        </a>
        <p v-else class="muted">
          Link de pagamento ainda não configurado (<code>VITE_STRIPE_PAYMENT_LINK_URL</code>). Até
          lá, o ledger e o modelo já são públicos.
        </p>
        <p v-if="auth.isLoggedIn && auth.cid" class="cid-hint">
          Sessão: <strong>{{ auth.cid }}</strong> — se o Payment Link tiver o metadata
          <code>display_tag</code> com este CID (ou o acrescentares no link abaixo), o ledger pode
          mostrar a tag em vez de Anónimo.
        </p>
        <label v-if="auth.isLoggedIn && auth.cid && finance.paymentLink" class="toggle publish-cid">
          <input v-model="publishCid" type="checkbox" />
          <span>Tentar publicar o meu CID no ledger (via parâmetro do link Stripe)</span>
        </label>
      </div>
    </section>

    <!-- Resumo -->
    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad">
        <h2 class="section-title">Resumo</h2>
        <p v-if="finance.loading" class="muted">A carregar…</p>
        <p v-else-if="finance.error" class="err">{{ finance.error }}</p>
        <div v-else class="stats-grid">
          <div class="stat-mini">
            <div class="stat-mini__l">Entradas (doações)</div>
            <div class="stat-mini__v font-display">{{ formatMoney(r.total_in) }}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini__l">Saídas · infra</div>
            <div class="stat-mini__v font-display">{{ formatMoney(r.total_out_infra) }}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini__l">Saídas · maintainer</div>
            <div class="stat-mini__v font-display">{{ formatMoney(r.total_out_maintainer) }}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini__l">Saldo</div>
            <div class="stat-mini__v font-display">{{ formatMoney(r.balance) }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Ledger in -->
    <section class="av-card" style="margin-bottom: 1.25rem">
      <div class="av-card-pad">
        <h2 class="section-title">Doações (público)</h2>
        <p class="muted sm">Valor · data · etiqueta. Sem dados pessoais de contacto.</p>
        <div v-if="!finance.donations.length" class="empty">
          Ainda não há doações registadas no ledger.
        </div>
        <div v-else class="av-table-wrap">
          <table class="av-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Etiqueta</th>
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
      </div>
    </section>

    <!-- Ledger out -->
    <section class="av-card">
      <div class="av-card-pad">
        <h2 class="section-title">Saídas (público)</h2>
        <p class="muted sm">Infra vs trabalho do maintainer — para não haver caixa negra.</p>
        <div v-if="!finance.outflows.length" class="empty">
          Ainda não há saídas registadas (quando houver custos ou retirada de maintainer, entram
          aqui).
        </div>
        <div v-else class="av-table-wrap">
          <table class="av-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in finance.outflows" :key="o.id">
                <td>{{ formatDate(o.spent_on) }}</td>
                <td>
                  <span class="badge" :class="o.kind === 'maintainer' ? 'badge--gold' : 'badge--navy'">
                    {{ o.kind === 'maintainer' ? 'Maintainer' : 'Infra' }}
                  </span>
                </td>
                <td>{{ o.label }}</td>
                <td class="num">{{ formatMoney(o.amount_eur) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
  @media (min-width: 700px) {
    grid-template-columns: repeat(4, 1fr);
  }
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
