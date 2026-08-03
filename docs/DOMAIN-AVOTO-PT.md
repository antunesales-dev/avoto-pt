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

### 1. OVH — nameservers (passo a passo na UI)

**Só depois** de Status / Estado técnico **não** estarem “Em criação” (estarem **Activo**).

1. [manager.ovh.com](https://www.ovh.com/manager/) → **Web Cloud** → **Domínios e DNS**  
2. Lista à esquerda: clica **avoto.pt**  
3. Separador superior: **Servidores DNS**  
4. Botão **Configificar** (à direita de “Servidores DNS” / “OVHcloud default”)  
5. Opção tipo **Modificar os servidores DNS** / **Personalizar os servidores DNS**  
6. Remove os 2–4 servidores OVH (`dns*.ovh.net`, etc.)  
7. Adiciona **só estes dois** (um por linha):

```
edna.ns.cloudflare.com
quinton.ns.cloudflare.com
```

8. **Validar** / **Aplicar** / **Confirmar**  
9. A OVH pode mostrar “modificação em curso” — normal  

**Não** uses o botão “Zona DNS → Gerir” na OVH para o site de produção se os NS forem Cloudflare: a zona que manda passa a ser a do Cloudflare.

Propagação: frequentemente &lt; 1 h; pior caso 24–48 h.

> Enquanto o domínio estiver “Em criação”, a OVH bloqueia várias acções — espera.

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
