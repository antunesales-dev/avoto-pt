# A Voto — Bancada Cidadã

Plataforma cívica **independente** (não governamental), **open source**, neutra e transparente: cidadãos registados votam nas iniciativas do Parlamento e comparam o resultado com o voto real de cada partido.

| | |
|---|---|
| **Domínio** | [avoto.pt](https://avoto.pt) |
| **Stack** | Vue 3 · Quasar · Pinia · Zod · Supabase · Cloudflare (deploy) · **PWA** |
| **Auth** | Só magic link / código email (prova o email; sem password na UI) |
| **Locale** | pt-PT |
| **Repo** | https://github.com/antunesales-dev/avoto-pt |

---

## Princípios (não negociáveis)

1. **Open source total** — código e cálculos auditáveis  
2. **Só fontes oficiais** — Dados Abertos da AR / Estado (nunca notícias ou wikis)  
3. **Login obrigatório para votar** — um voto por ID por iniciativa; **imutável** após confirmação  
4. **Privacidade / RGPD** — email só para conta; sem NIF/CC obrigatório  
5. **Métricas públicas** — agregados e exportações, sem expor quem votou o quê  
6. **Partidos em ordem alfabética de sigla** — anti-enviesamento; só listas com métrica (% alinhamento) ordenam por valor (empate → A–Z). Explicado na UI em `/como-funciona` e `docs/GOV-DATA.md`  

---

## Arranque

Requisitos: Node 22+, pnpm, [Supabase CLI](https://supabase.com/docs/guides/cli). Docker só se quiseres stack **local** em paralelo.

### Ambientes

| | Produção | Dev |
|---|----------|-----|
| **Branch** | `main` | `dev` |
| **Host** | **Cloudflare** (marca: `avoto.pt`) | **GitHub Pages** |
| **URL** | https://avoto.pt · técnico: avoto-pt.pages.dev | https://antunesales-dev.github.io/avoto-pt/ |
| **Docs** | [`ENVIRONMENTS.md`](./docs/ENVIRONMENTS.md) · [`DOMAIN-AVOTO-PT.md`](./docs/DOMAIN-AVOTO-PT.md) | |

```bash
pnpm install
# .env local (gitignored) com VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
pnpm dev                 # local
git push origin dev      # → GitHub Pages (dev)
git push origin main     # → Cloudflare (prod)
```

### Stack Supabase só local (opcional)

```bash
pnpm db:start
# .env a partir de: supabase status -o env
pnpm dev
```

| Comando | Função |
|---------|--------|
| `pnpm dev` | App SPA local |
| `pnpm dev:pwa` | App em modo PWA |
| `pnpm build` | Build PWA produção (`dist/pwa`) |
| `pnpm db:start` | Supabase local |
| `pnpm db:stop` | Parar Supabase |
| `pnpm db:reset` | Migrations (local; seed vazio — usa `pnpm sync:ar`) |
| `pnpm db:status` | URL e keys locais |

### Fluxo real

1. **Entrar** (`/entrar`) com **email** → recebe **link + código** (sem palavra-passe)  
2. Primeiro acesso cria conta e `CID-XXXXXX` automaticamente  
3. **Votar** numa iniciativa → diálogo de confirmação → RPC `cast_voto`  
4. Segundo voto na mesma iniciativa → **rejeitado** (constraint + RPC)  
5. **Perfil** → histórico, preferência partidária, **notificações** (digest / leis / investimentos)  

Sem sessão: só leitura. Com sessão: perfil + voto.  
Auth + PWA: [`docs/AUTH-PWA.md`](./docs/AUTH-PWA.md).

---

## Base de dados

Migrations em `supabase/migrations/`.

| Objecto | Função |
|--------|--------|
| `profiles` | id ↔ auth.users, `cid` único, email, partido opcional |
| `iniciativas` | metadados + resultado_partidos (JSON) |
| `votos_cidadaos` | unique `(user_id, iniciativa_id)` — sem update/delete para clients |
| `cast_voto()` | RPC: auth + imutabilidade |
| `iniciativa_votos_agg` | view pública de contagens |
| `metricas_globais` | view pública |

RLS: perfil só do próprio; iniciativas públicas; votos só os próprios; insert de votos **só** via RPC.

Dados de conteúdo: **só fontes oficiais** (`pnpm sync:ar`, `despesa-sync`). `seed.sql` está vazio de propósito.

---

## Encriptação de dados de utilizador

- Votos e preferência partidária: **AES-256 na coluna** (pgcrypto + chave no Vault)
- Sem email em claro em `profiles` (email só no Auth)
- Acesso a PII/votos: **só RPC** com `auth.uid()` — sem select directo nas tabelas
- Detalhe: [`docs/ENCRYPTION.md`](./docs/ENCRYPTION.md)

## Segurança do repositório

Código público. Escrita e secrets só do dono. Ver [`SECURITY.md`](./SECURITY.md).

Nunca commitar `.env`, service role key, tokens Cloudflare.

---

## O que falta (próximas fatias completas)

Plano de tasks com critérios de done: **[`docs/PLAN-NEXT.md`](./docs/PLAN-NEXT.md)**

1. Supabase remoto (produção)  
2. Deploy Cloudflare Pages  
3. Import Dados Abertos da AR  
4. Auth de produção (email confirm + reset)  
5. ~~Licença~~ → **AGPL-3.0** (`LICENSE`)
6. Import Dados Abertos da AR  
7. Domínio `avoto.pt` (DNS OVH → Cloudflare)

---

## Licença

[AGPL-3.0](./LICENSE) — código aberto; modificações de versões em rede devem ser partilhadas.

**A Voto** — Bancada Cidadã · projecto cívico independente
