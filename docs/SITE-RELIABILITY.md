# Fiabilidade do site (avoto.pt) · o que controlamos

Para pitch e partilha pública: o site tem de **abrir à primeira**.  
Nem tudo está sob o nosso controlo — o que está, fica listado e automatizado.

## URLs oficiais

| Prioridade | URL | Notas |
|------------|-----|--------|
| **1 · Pitch** | https://avoto.pt | Domínio próprio · Cloudflare Free · Pages |
| **1b** | https://www.avoto.pt | Mesmo site |
| **2 · Fallback** | https://avoto-pt.pages.dev | Mesmo deploy de produção; usar se o domínio falhar no cliente |

**Staging (dev):** https://antunesales-dev.github.io/avoto-pt/ — **não** usar em pitch.

## O que já está controlado (nossa stack)

| Controlo | Estado |
|----------|--------|
| Hosting | Cloudflare Pages (produção = branch `main`) |
| DNS | CF Free · NS `edna` / `quinton` |
| SSL | Full + Always HTTPS · min TLS 1.2 |
| IPv6 | **Off** (evita `ERR_CONNECTION_REFUSED` em VPN/redes com IPv6 partido) |
| Geo-block / WAF custom | Nenhum (não bloqueamos países) |
| Deploy prod | Push a `main` → workflow “Deploy produção (Cloudflare)” |
| Smoke automático | Workflow **Uptime (avoto.pt)** a cada 30 min (Actions) |

## O que **não** controlamos (lado do visitante)

- VPN / proxy corporativo a bloquear Cloudflare  
- DNS antigo em cache no telemóvel  
- Rede de hotel / firewall de empresa  
- Intersticial do LinkedIn (`linkedin.com/safety/go?…`) — **não** partilha o site; o destino continua `https://avoto.pt`  
- Extensões do browser / adblock agressivo  

Nesses casos o browser mostra “recusou ligação” **sem** página de erro nossa.  
**Não é o LinkedIn a “partir” o A Voto** — é a rede do visitante a não completar TCP/HTTPS até à Cloudflare.

## Protocolo de pitch (usar sempre)

1. Partilhar **só** `https://avoto.pt` (link limpo, sem encurtadores).  
2. Se a pessoa falhar: pedir **tipo de rede** (casa / 4G / trabalho) e **VPN sim/não**.  
3. Pedir que tente de novo: janela anónima, sem VPN.  
4. Fallback no chat: `https://avoto-pt.pages.dev` (“mesmo site, outro endereço técnico”).  
5. Confirmar tu: Actions → **Uptime** verde + `curl -I https://avoto.pt` = 200.

### Texto curto se falhar no pitch

> Obrigado pelo aviso. O site está no ar do nosso lado (https://avoto.pt).  
> Podes dizer se era Wi‑Fi, telemóvel ou trabalho, e se tinhas VPN?  
> Tenta outra vez em https://avoto.pt (janela anónima / sem VPN).  
> Se ainda falhar: https://avoto-pt.pages.dev — é o mesmo projecto.

## Checklist se “está em baixo” de verdade

1. [ ] https://avoto.pt → 200?  
2. [ ] https://avoto-pt.pages.dev → 200?  
3. [ ] Cloudflare Dashboard → zona **Active**, não *Paused*  
4. [ ] Pages → custom domains **Active**  
5. [ ] Último deploy **main** com sucesso  
6. [ ] Actions **Uptime** — se vermelho, ver log  
7. [ ] Purge cache CF (Free: *Purge Everything*) se HTML/JS “preso”  
8. [ ] Confirmar IPv6 ainda **Off** (sem registos AAAA)

## Regra de release

| Branch | Onde vai |
|--------|----------|
| `dev` | Staging GH Pages |
| `main` | **Produção** avoto.pt + pages.dev |

Pitch só com código já em **`main`** (merge dev→main + deploy verde).

## Monitorização grátis (opcional extra)

Além do workflow GitHub:

- [UptimeRobot](https://uptimerobot.com) (free) → HTTP(s) `https://avoto.pt` + alerta email  
- Ou Better Stack / Hetrix free tier  

O workflow no repo já basta para ver falhas no GitHub sem cartão.
