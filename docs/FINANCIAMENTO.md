# Financiamento transparente · A Voto

## Modelo (requisitos)

| Requisito | Como |
|-----------|------|
| Pagar infra + trabalho do maintainer | Saídas públicas `infra` / `maintainer` |
| Não parecer “comprado” | Ledger público; sem privilégios a doadores |
| Sem expor IBAN/telefone | **Stripe** Payment Link (+ MB WAY se activo na conta) |
| Ledger | Valor + data + tag (**Anónimo** ou **CID**) — nunca email |

## Plano técnico (implementado)

1. **BD** — `donations` (privado + RPC pública), `project_outflows` (select público).  
2. **UI** — `/financiamento` (modelo, CTA Stripe, resumo, tabelas).  
3. **Stripe** — Payment Link no env `VITE_STRIPE_PAYMENT_LINK_URL`.  
4. **Webhook** — edge `stripe-webhook` → `record_donation` em `checkout.session.completed`.  
5. **CID opcional** — link com `client_reference_id=CID-…` se o utilizador marcar a opção.

## O que fazes no Stripe (uma vez)

1. Conta Stripe (PT) + activar **MB WAY** (Payment methods).  
2. **Payment Link** (montante livre ou fixos) → copiar URL.  
3. GitHub secret / `.env`: `VITE_STRIPE_PAYMENT_LINK_URL=https://buy.stripe.com/...`  
4. Webhook endpoint:  
   `https://qevavihconurfgmayzze.supabase.co/functions/v1/stripe-webhook`  
   Evento: `checkout.session.completed`  
5. `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`  
6. `supabase functions deploy stripe-webhook`

## Saídas (ops)

Inserir com service role / SQL editor (exemplos):

```sql
insert into public.project_outflows (amount_eur, spent_on, kind, label)
values
  (12.00, current_date, 'infra', 'Domínio avoto.pt (anual, rateado)'),
  (50.00, current_date, 'maintainer', 'Trabalho de manutenção — Agosto');
```

## Fiscalidade

O stipend de maintainer é rendimento a declarar (TOC). O ledger público não substitui contabilidade privada.
