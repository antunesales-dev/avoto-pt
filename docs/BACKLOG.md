# Backlog A Voto (dev)

Prioridade para continuar sem o Tiago à frente. **Não** testar login com emails reais.

## Feito (transparência + auth)

- Digest só com datas oficiais; IDs Base estáveis; dedup
- Perfil: um Sair/Apagar; boolean disabled
- Comparação: sem % inventados com zero votos
- SECURITY INVOKER nas RPCs públicas
- OTP: rate limit app só após envio; mensagem EMAIL_RATE_LIMITED; cooldown UI
- Footer sticky sem navy a subir
- **/dados**: syncs ao vivo (`ar_sync_runs` SELECT público), tabela “que data conta onde”
- Despesa / Investimentos: empty states honestos; data = publicação oficial
- Docs: AUTH-EMAIL, SECURITY-LINTER, GOV-DATA digest

## Depois (sem bloqueio do owner)

1. Testes unitários — alinhamento, datas digest
2. ConfirmarEmail / registo — cooldown email (mesmo padrão)
3. PWA cache / bundles antigos
4. A11y

## Só com o Tiago

- SMTP Supabase (limite `over_email_send_rate_limit`)
- Secrets GH / cron se em falta
- HIBP (Pro Auth)
- Domínio / prod Cloudflare
