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
          Podes contribuir de forma segura (por exemplo cartão ou MB WAY, conforme o que o
          pagamento oferecer). O pagamento abre noutro ecrã; a A Voto não pede nem mostra o teu
          IBAN ou telemóvel.
        </p>
        <a
          v-if="finance.paymentLink"
          class="btn btn--primary"
          :href="donateHref"
          target="_blank"
          rel="noopener noreferrer"
        >
          Quero apoiar
        </a>
        <p v-else class="muted">
          O botão de pagamento ainda não está activo. Em breve poderás doar por aqui; até lá, as
          contas públicas (quando houver movimentos) ficam nesta página.
        </p>
        <label v-if="auth.isLoggedIn && auth.cid && finance.paymentLink" class="toggle publish-cid">
          <input v-model="publishCid" type="checkbox" />
          <span>
            Mostrar o meu ID de cidadão (<strong>{{ auth.cid }}</strong>) na lista pública de
            doações (em vez de “Anónimo”)
          </span>
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
