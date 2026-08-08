# Emails de auth · A Voto (pt-PT)

## Decisão de produto

| Opção | Usamos? | Porquê |
|-------|---------|--------|
| **Magic link + código (OTP)** | **Sim — único caminho na UI** | Obriga a controlar o email; sem password reutilizada |
| Palavra-passe | **Não na UI** | Com `enable_confirmations` fraco no passado, dava sessão sem provar email; recuperação confusa |
| SMTP próprio | **Sim, em produção de marca** | Limites e deliverability; built-in Supabase esgota (`over_email_send_rate_limit`) |

Password **não** é necessária se o login for só OTP/link. Código no repositório ainda tem RPCs legadas de password; a UI de Entrar/Registo **não as expõe**.

---

## Templates no repositório

| Ficheiro | Template Supabase Dashboard |
|----------|------------------------------|
| `supabase/templates/magic_link.html` | **Magic Link** |
| `supabase/templates/confirmation.html` | **Confirm signup** (se ainda for enviado em algum fluxo) |

Assuntos sugeridos (Dashboard → Auth → Email Templates):

| Template | Subject |
|----------|---------|
| Magic Link | `Entrar na A Voto — link e código` |
| Confirm signup | `Confirme o email · A Voto` |

Variáveis GoTrue: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`.

---

## Aplicar no projecto cloud (obrigatório — não vai por migration SQL)

1. [Authentication → Email Templates](https://supabase.com/dashboard/project/qevavihconurfgmayzze/auth/templates)
2. **Magic Link** → colar HTML de `magic_link.html` + subject acima → Save  
3. **Confirm signup** → `confirmation.html`  
4. Desactivar templates que não usa (Invite, etc.) ou deixar default se não forem enviados  

### URL configuration (mesmo ecrã Auth)

| Campo | Staging (agora) | Quando `avoto.pt` existir |
|-------|-----------------|---------------------------|
| Site URL | `https://antunesales-dev.github.io/avoto-pt` | `https://avoto.pt` |
| Redirect URLs | `https://antunesales-dev.github.io/avoto-pt/**` | `https://avoto.pt/**` + `https://www.avoto.pt/**` |
| | `…/auth/callback` | idem |

---

## SMTP (recomendado antes de campanha / go-live)

Built-in Supabase: poucos emails/hora → 429 em testes.

1. Auth → SMTP Settings  
2. Provider (ex. Resend, Postmark, Amazon SES, OVH mail se tiveres)  
3. Sender: algo como `A Voto <noreply@avoto.pt>` **depois** do domínio verificado no provider  
4. SPF/DKIM no DNS do domínio (quando OVH/CF estiverem ok)

Até ter SMTP + domínio: usar com parcimónia o mail built-in; cooldown na app já limita cliques.

---

## Local (`config.toml`)

Para `supabase start`, descomentar e apontar:

```toml
[auth.email.template.magic_link]
subject = "Entrar na A Voto — link e código"
content_path = "./supabase/templates/magic_link.html"

[auth.email.template.confirmation]
subject = "Confirme o email · A Voto"
content_path = "./supabase/templates/confirmation.html"
```

Isto **não** actualiza o projecto hosted sozinho — o dashboard (ou Management API) manda no cloud.
