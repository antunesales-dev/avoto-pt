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

## Epic 2 — Deploy Cloudflare Pages

**Done when:** URL pública HTTPS serve o build; env vars de produção configuradas; SPA history mode funciona.

### Tasks

| ID | Task | Detalhe | Done when |
|----|------|---------|-----------|
| **2.1** | Conta Cloudflare + Pages | Projecto Pages ligado ao GitHub `antunesales-dev/avoto-pt` | Repo ligado; build trigger em push a `main` |
| **2.2** | Build config | Build command: `pnpm install && pnpm build` · Output: `dist/spa` · Node compatível (22+) | Build verde no dashboard |
| **2.3** | Env de produção | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (valores do Epic 1) | App em produção fala com Supabase cloud |
| **2.4** | SPA fallback | `_redirects` ou regra Pages: `/* /index.html 200` (history mode) | Refresh em `/iniciativas` não dá 404 |
| **2.5** | Smoke test produção | Registo · login · voto · perfil · métricas | Fluxo completo no URL `*.pages.dev` |
| **2.6** | Domínio `avoto.pt` | DNS + custom domain no Pages (quando o domínio existir) | HTTPS em avoto.pt |
| **2.7** | CORS / Auth URLs | Supabase → Authentication → URL configuration: site URL + redirect URLs do domínio Pages/avoto.pt | Login/registo sem erro de redirect |

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

## Epic 5 — Licença open source

**Done when:** ficheiro `LICENSE` no root; README e GitHub alinhados.

### Tasks

| ID | Task | Detalhe | Done when |
|----|------|---------|-----------|
| **5.1** | Escolher licença | **Decisão de produto:** **AGPL-3.0** (recomendado: serviço na rede obriga a partilhar modificações) **ou** MIT (mais permissiva) | Escolha registada |
| **5.2** | Adicionar `LICENSE` | Texto oficial da licença | Ficheiro no root |
| **5.3** | Actualizar README + GitHub | Badge/secção licença · `gh repo edit --license …` se aplicável | UI GitHub mostra licença |
| **5.4** | NOTICE / copyright | Ano + “A Voto” / maintainer | Consistente no footer legal se existir |

**Dependências:** nenhuma (pode ser o mais cedo).  
**Recomendação técnica/civic:** **AGPL-3.0** — alinha com “open source total” e evita fork fechado do backend hospedado.

---

## Ordem de execução (checklist)

```
[ ] 5.1–5.4  Licença (rápido, qualquer altura)
[ ] 1.1–1.7  Supabase cloud
[ ] 2.1–2.5  Cloudflare Pages (*.pages.dev)
[ ] 4.1–4.6  Auth produção (com URL Pages)
[ ] 2.6–2.7  Domínio avoto.pt + redirects finais
[ ] 3.1–3.7  Import AR
```

### Critério de “MVP produção”

- Utilizador qualquer regista-se, confirma email, vota uma vez, vê agregados.  
- Dados de iniciativas: seed **ou** primeira sync AR.  
- HTTPS público.  
- LICENSE no repo.  
- Sem secrets no git.

---

## O que **não** entra neste plano

- App nativa / PWA obrigatória  
- Verificação de identidade real (NIF/CC) — fora de âmbito  
- Monetização / ads  
- Fontes não oficiais  

---

## Próxima acção concreta (agora)

1. Tu: criar projecto Supabase EU e enviar (ou meter em `.env`) **URL + anon key** (nunca service_role no chat se preferires).  
2. Agente/dev: **1.2–1.6** + **2.1–2.5**.  
3. Em paralelo se quiseres: **5.x** com AGPL-3.0.

Actualizar este ficheiro marcando tasks `[x]` à medida que fecham.
