# Backlog A Voto (dev)

Prioridade para continuar sem o Tiago à frente. **Não** testar login com emails reais.

## Feito nesta sessão (resumo)

- Digest só com datas oficiais; IDs Base estáveis; dedup
- Perfil: um Sair/Apagar; boolean disabled
- Comparação: sem % inventados com zero votos
- SECURITY INVOKER nas RPCs públicas
- OTP: rate limit app só após envio; mensagem EMAIL_RATE_LIMITED; cooldown UI
- Footer sticky sem navy a subir
- Docs: AUTH-EMAIL, SECURITY-LINTER, GOV-DATA digest

## Próximo (código seguro, sem ops na conta do owner)

1. **SMTP custom** (doc + checklist no dashboard) — reduz `over_email_send_rate_limit`
2. **ConfirmarEmail / registo** — mesmo cooldown e mensagens de email limit
3. **ar-sync** — garantir cron + service role; ver se iniciativas estão actualizadas
4. **Testes unitários** — `alinhamentoCidadaosPartido`, helpers de data do digest
5. **PWA / Service Worker** — cache agressivo pode servir bundles antigos; headers ou version bump
6. **CSP** — se o GH Pages injectar inline; hash ou nonce se for nosso
7. **Investimentos / Despesa** — filtros e empty states honestos (como digest)
8. **Accessibilidade** — focus traps, labels, contraste footer

## Só com o Tiago

- Upgrade / SMTP Supabase
- Secrets GH em falta (service role no sync-daily se ainda não)
- HIBP leaked passwords (Pro Auth toggle)
- Domínio custom / produção Cloudflare
- Product: o que mostrar no “resumo” além do boletim por data oficial
