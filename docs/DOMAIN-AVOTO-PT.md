# Domínio avoto.pt → Cloudflare Pages

## Estado actual

| Peça | Estado |
|------|--------|
| Domínio (Dominios.pt) | Registado — **ainda falta** apontar NS para Cloudflare |
| Zona Cloudflare | `pending` · ID `b8bac63d614926b55f4f574a9fd12b53` · plano **Free Website** |
| Nameservers CF | `edna.ns.cloudflare.com` · `quinton.ns.cloudflare.com` |
| DNS na CF (feito) | CNAME `@` + `www` → `avoto-pt.pages.dev` (**proxied**, free) |
| SSL free (feito) | Full + Always HTTPS + min TLS 1.2 + Brotli + HTTPS rewrites |
| **Não** activado | Argo, Load Balancing, Bot Management, Image Resizing, R2 extra, Workers paid |
| Pages project | `avoto-pt` · fallback `https://avoto-pt.pages.dev` |
| Custom domains Pages | `avoto.pt` + `www.avoto.pt` (pending até NS no registo) |
| App live | https://avoto-pt.pages.dev (já funciona) |

---

## O que fazer (ordem)

### 1. Dominios.pt — nameservers (único passo que falta no registo)

1. [my.dominios.pt](https://my.dominios.pt/) → domínio **avoto.pt** → **NAMESERVERS**  
2. Escolhe **Usar nameservers personalizados**  
3. Preenche **só**:

```
edna.ns.cloudflare.com
quinton.ns.cloudflare.com
```

(NS 3–5 vazios. **Não** deixar `dns*.host-redirect.com`.)  
4. **Alterar Nameservers**  

**Não** cries alojamento Dominios / “Web Domain 1GB” / “Site Onepage” — o site é Pages (grátis no free tier).

Propagação: frequentemente &lt; 1 h; pior caso 24–48 h.

### 2. Cloudflare — activar a zona

1. [Dashboard DNS avoto.pt](https://dash.cloudflare.com/ffcb12388856fa739c1e876cce0feae0/avoto.pt)  
2. Quando os nameservers estiverem correctos, clica **Continue to activation** / **Check nameservers**  
3. Status da zona deve passar a **Active**

### 3. Cloudflare — registos DNS

Com a zona **Active**, em **DNS → Records → Add record**:

| Type  | Name | Content               | Proxy |
|-------|------|-----------------------|-------|
| CNAME | `@`  | `avoto-pt.pages.dev`  | **Proxied** (nuvem laranja) |
| CNAME | `www`| `avoto-pt.pages.dev`  | **Proxied** |

Cloudflare faz *CNAME flattening* no apex (`@`).

### 4. Pages — confirmar custom domains

1. [Pages → avoto-pt → Custom domains](https://dash.cloudflare.com)  
2. `avoto.pt` e `www.avoto.pt` devem ir de *pending* → **Active**  
3. SSL (Google Trust / Cloudflare) emite sozinho após DNS OK  

(Já foram pedidos via API; só falta DNS + NS.)

### 5. Supabase Auth — URLs (depois de avoto.pt responder)

Dashboard Supabase → Authentication → URL configuration:

- **Site URL:** `https://avoto.pt`
- **Redirect URLs** (allow list):
  - `https://avoto.pt/**`
  - `https://www.avoto.pt/**`
  - `https://avoto-pt.pages.dev/**` (manter)
  - `http://127.0.0.1:9000/**`
  - `http://localhost:9000/**`

### 6. Verificar

```bash
dig NS avoto.pt +short
# esperado: edna / quinton .ns.cloudflare.com

dig CNAME avoto.pt +short   # ou A (flattening)
curl -sI https://avoto.pt | head -5
curl -sI https://www.avoto.pt | head -5
```

---

## Não faças

- **Não** cries alojamento OVH para o site (Pages já hospeda)  
- **Não** deixes nameservers na OVH **e** registos só no Cloudflare (a zona CF fica `pending` para sempre)  
- **Não** uses A record inventado — usa **CNAME → avoto-pt.pages.dev**  

---

## Checklist

- [x] Dominios.pt: NS → edna + quinton  
- [x] Cloudflare: zona Active · Free · IPv6 **off**  
- [x] Cloudflare: CNAME `@` e `www` → `avoto-pt.pages.dev` (proxied)  
- [x] Pages: custom domains Active + HTTPS  
- [ ] Supabase: Site URL + redirects → `https://avoto.pt` (confirmar no dashboard)  
- [x] Smoke: https://avoto.pt  
- [ ] Pitch: ver **docs/SITE-RELIABILITY.md** (fallback pages.dev + uptime)  

