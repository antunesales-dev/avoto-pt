# Domínio avoto.pt → Cloudflare Pages

## Estado actual

| Peça | Estado |
|------|--------|
| Domínio OVH | **Em criação** (aguardar ficar Activo) |
| Zona Cloudflare | `pending` · ID `b8bac63d614926b55f4f574a9fd12b53` |
| Nameservers CF | `edna.ns.cloudflare.com` · `quinton.ns.cloudflare.com` |
| Pages project | `avoto-pt` · fallback `https://avoto-pt.pages.dev` |
| Custom domains Pages | `avoto.pt` + `www.avoto.pt` **adicionados** (pending CNAME/NS) |
| App live | https://avoto-pt.pages.dev (já funciona) |

---

## O que fazer (ordem)

### 1. OVH — esperar o domínio

No ecrã OVH, quando **Status do domínio** e **Estado técnico** deixarem de estar “Em criação” e passarem a **Activo**:

1. Abrir **avoto.pt** → **Servidores DNS** → **Configurar**
2. Trocar de **OVHcloud default** para **nameservers externos**:

```
edna.ns.cloudflare.com
quinton.ns.cloudflare.com
```

3. Guardar. Propagação: minutos a ~24–48 h (muitas vezes &lt; 1 h).

> Enquanto o domínio estiver “Em criação”, a OVH bloqueia várias acções — é normal. Não configures registos DNS na OVH se fores usar Cloudflare como DNS (Full).

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

- [ ] OVH: domínio Activo  
- [ ] OVH: NS → edna + quinton  
- [ ] Cloudflare: zona Active  
- [ ] Cloudflare: CNAME `@` e `www` → `avoto-pt.pages.dev` (proxied)  
- [ ] Pages: custom domains Active + HTTPS  
- [ ] Supabase: Site URL + redirects  
- [ ] Smoke: registo / login / votar em https://avoto.pt  
