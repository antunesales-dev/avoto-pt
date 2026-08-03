# Plano de tasks — produção A Voto

**Objectivo:** sair do local e ter a app utilizável por qualquer pessoa, com dados oficiais e auth de produção.  
**Regra:** cada epic fecha de ponta a ponta (nada de “demo a meio”).  
**Ordem:** 1 → 2 → 4 (em paralelo parcial com 2) → 3 → 5.  
*(Auth de produção depende do domínio do deploy; import AR pode começar depois do remoto estar estável.)*

---

## Epic 1 — Supabase remoto (produção) — ✅ CONCLUÍDA

**Done when:** migrations + encriptação aplicadas num projecto Supabase cloud; a app local (ou deploy) aponta para ele com `.env` real; registo/login/voto persistem fora da máquina.

**Projecto:** `qevavihconurfgmayzze` · Frankfurt · [dashboard](https://supabase.com/dashboard/project/qevavihconurfgmayzze) · ver `docs/SUPABASE-REMOTE.md`

### Tasks

| ID | Task | Estado |
|----|------|--------|
| **1.1** | Criar projecto Supabase EU | ✅ |
| **1.2** | Ligar CLI (`supabase link`) | ✅ |
| **1.3** | `db push` (init + encryption) | ✅ |
| **1.4** | Verificar encriptação + voto imutável no cloud | ✅ |
| **1.5** | Seed 8 iniciativas | ✅ |
| **1.6** | `.env` local → remoto (anon only) | ✅ gitignored |
| **1.7** | Secrets ops (`.env.supabase.remote`) | ✅ gitignored |

**Dependências:** nenhuma.

---

## Epic 2 — Deploy Cloudflare Pages — ✅ base em produção

**Done when:** URL pública HTTPS serve o build; env vars de produção configuradas; SPA history mode funciona.

**URL:** https://avoto-pt.pages.dev · ver `docs/DEPLOY.md`

### Tasks

| ID | Task | Estado |
|----|------|--------|
| **2.1** | Projecto Cloudflare Pages `avoto-pt` | ✅ |
| **2.2** | Build `pnpm build` → `dist/spa` | ✅ |
| **2.3** | Env build com Supabase cloud | ✅ |
| **2.4** | SPA `_redirects` + headers | ✅ `/iniciativas` → 200 |
| **2.5** | Smoke HTML + API iniciativas | ✅ |
| **2.5b** | CI deploy (GitHub Actions + secrets) | ✅ |
| **2.6** | Domínio `avoto.pt` | ⏳ OVH em criação · CF zone pending · ver `docs/DOMAIN-AVOTO-PT.md` |
| **2.7** | Auth site URL Pages | ✅ `https://avoto-pt.pages.dev` |

**Dependências:** 1.1–1.6 (keys reais).  
**Paralelo:** 2.1–2.2 podem preparar-se com keys placeholder, mas smoke real precisa de 1.x.

---

## Epic 3 — Import Dados Abertos da AR

**Done when:** job agendado actualiza `iniciativas` (+ `resultado_partidos`) só a partir de fontes oficiais; seed deixa de ser a fonte em produção.

### Tasks

| ID | Task | Detalhe | Done when |
|----|------|---------|-----------|
| **3.1** | Mapear API/dados oficiais | [Dados Abertos AR](https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx) · endpoints JSON/XML · campos ↔ schema `iniciativas` | Doc `docs/AR-IMPORT.md` com mapeamento e limitações |
| **3.2** | Desenhar sync idempotente | Upsert por `id` / `id_oficial` · não apagar votos · actualizar só metadados e resultados de partidos | Spec escrita (pseudo ou SQL) |
| **3.3** | Implementar job | Cloudflare Worker cron **ou** Supabase Edge Function + schedule · service_role só no backend | Código no repo + deploy do job |
| **3.4** | Observabilidade | Logs de sucesso/falha · contagem upserts · alerta se falhar N vezes | Consegues ver última sync e erros |
| **3.5** | Política de lacunas | Se AR não tiver detalhe: campos null + flag/limitação na UI (não inventar) | UI declara limitação; sem fontes noticiosas |
| **3.6** | Correr em produção | Primeira sync real no Supabase cloud | `iniciativas` preenchidas por job, não só seed |
| **3.7** | Remover dependência do seed em prod | Seed só local/dev | README actualizado |

**Dependências:** Epic 1 (BD remota). Idealmente Epic 2 se o job for Worker no mesmo projecto CF.  
**Nota:** este epic é o maior; pode fatiar-se em “sync manual one-shot” (3.3 MVP) e depois cron (3.3 completo).

---

## Epic 4 — Auth de produção

**Done when:** email confirmation + reset password funcionam no domínio real; redirects correctos; sem “confirmations=false” de local.

### Tasks

| ID | Task | Detalhe | Done when |
|----|------|---------|-----------|
| **4.1** | Site URL + redirects | Supabase Auth: `https://avoto.pt` (ou pages.dev) + `…/**` | Documentado e aplicado |
| **4.2** | Activar confirmação de email | Dashboard Auth · enable confirmations | Signup sem confirmar não entra (ou fluxo explícito) |
| **4.3** | Templates email pt-PT | Confirm signup · reset password · copy A Voto / independente | Emails em português de Portugal |
| **4.4** | UI recuperação | Página `/recuperar-password` + `/atualizar-password` (ou deep link) | User consegue reset end-to-end |
| **4.5** | UI “confirme o email” | Após registo, mensagem clara se `needsEmailConfirmation` | Sem beco sem saída |
| **4.6** | Teste E2E auth prod | Conta nova · confirmar mail · login · reset · votar | Checklist passado |
| **4.7** | Rate limits / abuso | Defaults Supabase + captcha opcional se spam | Documentado; sem open relay óbvio |

**Dependências:** Epic 2 (URL estável). Pode usar `*.pages.dev` antes de avoto.pt (4.1 com URL Pages).

---

## Epic 5 — Licença open source — ✅ AGPL-3.0

**Done when:** ficheiro `LICENSE` no root; README e GitHub alinhados.

| ID | Task | Estado |
|----|------|--------|
| **5.1–5.3** | AGPL-3.0 + LICENSE + README | ✅ |

## Epic 4 — Auth de produção — ✅ UI + passwordless

| ID | Task | Estado |
|----|------|--------|
| **4.1** | Redirect URLs (pages.dev, gh pages, avoto.pt, localhost) | ✅ API |
| **4.4–4.5** | UI recuperar / actualizar password / confirmar email | ✅ |
| **4.8** | Magic link + OTP (login principal sem password) | ✅ |
| **4.2–4.3** | Templates email Supabase pt-PT (incl. magic link) | ⏳ dashboard (manual) |
| **4.6** | E2E com email real | ⏳ precisa mailbox |

Ver `docs/AUTH-PWA.md`.

## Epic 6 — PWA + notificações cívicas — ✅ base

| ID | Task | Estado |
|----|------|--------|
| **6.1** | Quasar PWA (manifest, icons, SW InjectManifest) | ✅ |
| **6.2** | Preferências `notification_prefs` + RLS | ✅ migration |
| **6.3** | UI Perfil (permissão browser + toggles) | ✅ |
| **6.4** | Realtime → notificação local (digest, leis, investimentos) | ✅ |
| **6.5** | Web Push VAPID (app fechada) | ⏳ chaves + edge |

---

## Ordem de execução (checklist)

```
[x] 1.1–1.7  Supabase cloud
[x] 2.1–2.5  Cloudflare Pages (https://avoto-pt.pages.dev)
[x] 2.7      Auth site URL → pages.dev
[x] 5.x      Licença AGPL-3.0
[x] 4.x      Auth UI + magic link/OTP + allow list
[x] 6.1–6.4  PWA instalável + notificações (tab/PWA aberta)
[ ] 4.2–4.3  Templates email no dashboard Supabase
[ ] 6.5      Web Push VAPID
[ ] 2.6      Domínio avoto.pt (OVH NS)
[ ] 3.1–3.7  Import AR
```

### Critério de “MVP produção”

- Utilizador entra com email (link/código), vota uma vez, vê agregados.  
- Dados de iniciativas: sync AR real (sem seed em produção).  
- HTTPS público + PWA instalável.  
- LICENSE no repo.  
- Sem secrets no git.

---

## O que **não** entra neste plano

- App nativa (iOS/Android stores) — PWA basta  
- Verificação de identidade real (NIF/CC) — fora de âmbito  
- Monetização / ads  
- Fontes não oficiais  

---

## Próxima acção concreta (agora)

1. Tu: secrets GitHub `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AVOTO_CRON_SECRET` para `sync-daily.yml` (se ainda não).  
2. Tu: templates email pt-PT + DNS avoto.pt.  
3. Opcional: `pnpm sync:ar -- --limit=200` local / workflow_dispatch para encher mais iniciativas.
