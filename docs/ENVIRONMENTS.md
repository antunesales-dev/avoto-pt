# Ambientes: prod vs dev

| | **Produção** | **Desenvolvimento** |
|---|--------------|---------------------|
| **Branch** | `main` | `dev` |
| **Hosting** | **Cloudflare Pages** | **GitHub Pages** |
| **URL** | https://avoto.pt (quando DNS OK) · fallback técnico `avoto-pt.pages.dev` | https://antunesales-dev.github.io/avoto-pt/ |
| **Workflow** | `.github/workflows/deploy-cloudflare-prod.yml` | `.github/workflows/deploy-github-pages-dev.yml` |
| **Base path** | `/` | `/avoto-pt/` |
| **Supabase** | projecto cloud prod | preferir projecto staging (ou o mesmo até teres segundo) |

## Porque o `pages.dev` ainda aparece?

`*.pages.dev` é o **hostname técnico** que a Cloudflare dá a cada projecto Pages.  
Não é o “produto final” — é como o IP do servidor enquanto o domínio custom não está activo.

- **Utilizadores / marca:** `https://avoto.pt`  
- **Infra Cloudflare (sempre existe):** `https://avoto-pt.pages.dev`  
- **Dev / preview de equipa:** GitHub Pages no branch `dev`

Quando o DNS de `avoto.pt` estiver OK, a URL “oficial” de produção é **só** avoto.pt. O `pages.dev` fica como fallback interno (CI, smoke, debug).

## Fluxo de trabalho

```bash
# trabalho do dia-a-dia
git checkout dev
# ... commits ...
git push origin dev          # → deploy automático GitHub Pages (dev)

# release para produção
git checkout main
git merge dev                # ou PR dev → main
git push origin main         # → deploy automático Cloudflare (prod)
```

## OVH: nameservers (passo a passo)

O domínio está na OVH; o DNS de produção deve ser o **Cloudflare** (Full).

### Quando o domínio deixar de estar “Em criação”

1. Entra em [OVHcloud Manager](https://www.ovh.com/manager/) → **Web Cloud** → **Domínios**  
2. Clica em **avoto.pt**  
3. Separador **Servidores DNS** (ou **DNS servers**)  
4. Clica **Configurar** / **Modificar os servidores DNS**  
5. Escolhe **Servidores DNS externos** / **Personalizar** (não “OVHcloud default”)  
6. Apaga os NS da OVH e mete **exactamente**:

```
edna.ns.cloudflare.com
quinton.ns.cloudflare.com
```

7. **Confirma / Aplicar**  
8. Espera a OVH aceitar (pode demorar minutos; propagação global até 24–48 h)

### Não faças na OVH

- Não cries “Alojamento web” OVH para este site  
- Não configures a zona DNS na OVH se os NS forem Cloudflare (a zona útil passa a ser a do CF)

### Depois na Cloudflare

1. [DNS avoto.pt](https://dash.cloudflare.com) → **Continue to activation** quando detectar os NS  
2. Registos (se ainda não existirem):

| Type | Name | Target | Proxy |
|------|------|--------|--------|
| CNAME | `@` | `avoto-pt.pages.dev` | Proxied |
| CNAME | `www` | `avoto-pt.pages.dev` | Proxied |

3. **Pages → avoto-pt → Custom domains** → `avoto.pt` e `www.avoto.pt` Active  
4. Supabase Auth → Site URL `https://avoto.pt`

Guia extra: [`DOMAIN-AVOTO-PT.md`](./DOMAIN-AVOTO-PT.md)

## Secrets GitHub

Repo → Settings → Secrets and variables → Actions:

| Secret | Uso |
|--------|-----|
| `VITE_SUPABASE_URL` | Build prod + dev (por agora) |
| `VITE_SUPABASE_ANON_KEY` | idem |
| `CLOUDFLARE_API_TOKEN` | só workflow prod |
| `CLOUDFLARE_ACCOUNT_ID` | só workflow prod |

Opcional mais tarde: `VITE_SUPABASE_URL_DEV` / `*_ANON_KEY_DEV` + projecto Supabase de staging.
