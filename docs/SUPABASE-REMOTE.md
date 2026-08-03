# Supabase remoto — A Voto (fase 1)

| | |
|---|---|
| **Project ref** | `qevavihconurfgmayzze` |
| **Nome** | avoto-pt |
| **Região** | Central EU (Frankfurt) `eu-central-1` |
| **Dashboard** | https://supabase.com/dashboard/project/qevavihconurfgmayzze |
| **API URL** | `https://qevavihconurfgmayzze.supabase.co` |
| **Estado fase 1** | Migrations + seed + encriptação + testes RPC OK |

## Secrets (nunca no git)

Ficheiros **locais** (gitignored):

| Ficheiro | Conteúdo |
|----------|----------|
| `.env` | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (frontend) |
| `.env.supabase.remote` | ref, DB password, anon, **service_role** (só ops) |

## CLI

```bash
# já linkado neste repo
supabase link --project-ref qevavihconurfgmayzze
supabase db push
supabase db query --linked "select count(*) from iniciativas;"
```

## Auth (remoto)

Por omissão o projecto cloud exige **confirmação de email** no signup público.  
Para testes de API usámos `auth/v1/admin/users` com `email_confirm: true` (service_role).  

Na **fase 4** (auth produção): redirects + templates + fluxo de confirmação na UI.

## Verificado (fase 1)

- [x] Projecto ACTIVE_HEALTHY  
- [x] `db push` (init + encryption)  
- [x] Seed: 8 iniciativas  
- [x] Login user confirmado → `get_my_profile` (CID)  
- [x] Select directo `profiles` / `votos_cidadaos` → `[]`  
- [x] `cast_voto` OK; segundo voto → `ALREADY_VOTED`  
- [x] Agregados públicos actualizados  

## Próximo

Epic 2 — Cloudflare Pages (`docs/PLAN-NEXT.md`).
