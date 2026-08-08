# Financiamento transparente · A Voto

## Modelo (requisitos)

| Requisito | Como |
|-----------|------|
| Pagar infra + trabalho do maintainer | Modelo na página; saídas detalhadas **não** na UI (por agora) |
| Não parecer “comprado” | Ledger público de **doações**; sem privilégios a doadores |
| Sem expor IBAN/telefone | **Stripe** Payment Link (+ MB WAY se activo na conta) |
| Ledger | Valor + data + tag (**Anónimo** ou **CID**) — nunca email |

## Plano técnico (implementado)

1. **BD** — `donations` + RPC pública; tabela `project_outflows` existe mas **não** é usada na UI.  
2. **UI** — `/financiamento` (modelo, CTA, total + lista de doações).  
3. **Stripe** — Payment Link no env `VITE_STRIPE_PAYMENT_LINK_URL`.  
4. **Webhook** — edge `stripe-webhook` → `record_donation` em `checkout.session.completed`.  
5. **CID opcional** — `client_reference_id=CID-…` se o utilizador marcar a opção.

## O que fazes no Stripe (uma vez)

1. Conta Stripe (PT) + activar **MB WAY** (Payment methods).  
2. **Payment Link** (montante livre ou fixos) → copiar URL `https://buy.stripe.com/...`.  
3. **Activar o botão na app** (escolhe um):
   - **SQL** (imediato, sem rebuild):
     ```sql
     update public.site_settings
     set stripe_payment_link_url = 'https://buy.stripe.com/SEU_LINK',
         updated_at = now()
     where id = 1;
     ```
   - ou secret de build `VITE_STRIPE_PAYMENT_LINK_URL` (fallback).  
4. Webhook:  
   `https://qevavihconurfgmayzze.supabase.co/functions/v1/stripe-webhook`  
   Evento: `checkout.session.completed`  
5. `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`  
6. `supabase functions deploy stripe-webhook`  

**Doar não exige login.** Conta só serve se quiseres mostrar o CID na lista.

## Saídas

Removidas da UI por agora. A tabela `project_outflows` fica na BD se no futuro quiseres
publicar gastos; não é obrigatória.

## Fiscalidade

O stipend de maintainer é rendimento a declarar (TOC). O ledger público não substitui contabilidade privada.
