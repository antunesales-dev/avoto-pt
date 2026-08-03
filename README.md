# A Voto — Bancada Cidadã

**Mostrar, de forma transparente e sem enviesamento, se existe (ou não) desvio entre a vontade dos cidadãos que se deram ao trabalho de votar e o que cada partido realmente votou na Assembleia da República.**

| | |
|---|---|
| **Produto** | A Voto |
| **Slogan** | Bancada Cidadã |
| **Domínio** | [avoto.pt](https://avoto.pt) |
| **Estado** | UI de demonstração (login demo, voto com confirmação, dados mock) |
| **Locale** | Português de Portugal (pt-PT) |
| **Stack** | Vue 3 · Vite · Quasar · Pinia · Zod |

---

## O que é

Plataforma cívica **independente** (não governamental), **open source**, neutra e transparente onde cidadãos registados votam (uma vez por item) nas iniciativas do Parlamento e comparam o resultado agregado com o voto real de cada partido.

**Não é** um serviço do Estado, da AR ou de qualquer partido. **Não é** democracia directa, sondagem oficial, nem motor de recomendações políticas. Usa dados públicos oficiais da AR como fonte — fonte ≠ afiliação.

Documento de requisitos: [`context.md`](./context.md).

---

## Arranque local

```bash
pnpm install
pnpm dev
```

```bash
pnpm build   # produção → dist/spa
```

Requisito: Node.js 22+ (ou 24 LTS) e [pnpm](https://pnpm.io).

---

## Páginas e navegação

| Rota | Descrição |
|------|-----------|
| `/` | Início — hero, métricas, iniciativas recentes |
| `/iniciativas` | Lista com pesquisa e filtros |
| `/iniciativas/:id` | Detalhe, cidadãos vs partidos, alinhamento |
| `/comparacao` | Alinhamento global + matriz |
| `/metricas` | Dashboard público + export JSON demo |
| `/como-funciona` | Fluxo do produto |
| `/dados` | Fontes oficiais da AR |
| `/sobre` | Missão e princípios |
| `/privacidade` | RGPD / privacidade |
| `/perfil` | Pré-visualização do perfil (demo) |

### Layout (app shell)

- Barra superior única: logo + Início / Iniciativas / Comparação / Métricas + **Mais**
- Em ecrãs pequenos: hamburger com a mesma lista (sem sidebar, sem footer)

### Identidade visual

- **Cores** da Bandeira de Portugal: verde `#046A38`, vermelho `#DA291C`, ouro `#F1BF00`, azul do brasão `#00205B`, fundo creme  
- **Tipografia:** Cormorant Garamond (títulos) · Source Sans 3 (corpo) · IBM Plex Mono (IDs)  
- Copy e UI exclusivamente **pt-PT**

Dados de demo: [`src/data/mock.js`](./src/data/mock.js).

---

## Princípios (não negociáveis)

1. **Open source total** — código e cálculos auditáveis  
2. **Só fontes oficiais** — Dados Abertos da AR / Estado (nunca notícias ou wikis)  
3. **Um voto por ID** — sem voto anónimo puro; **login obrigatório para votar**  
4. **Privacidade / RGPD** — email só para conta; sem NIF/CC obrigatório  
5. **Métricas públicas** — participação, distribuições, exportações  

### Conta e voto (sempre)

- **Sem sessão:** pode ver iniciativas e métricas; **não** vota; botão **Entrar**.  
- **Com sessão:** botão **Perfil**; pode votar **uma vez** por iniciativa (confirmação; voto imutável).  
- Hoje a sessão é **demo** em memória; em produção será Supabase Auth (email + ID permanente).

---

## Estrutura do código

```
src/
  components/   # Brand, cards, barras de voto, footer
  css/          # Tema PT + estilos globais
  data/mock.js  # Iniciativas, partidos, métricas demo
  layouts/      # MainLayout (side + top nav)
  pages/        # Todas as rotas
  router/       # Vue Router (history mode)
```

---

## Próximos passos

1. Schema Supabase / PostgreSQL + RLS  
2. Importação dos Dados Abertos da AR  
3. Auth, ID de cidadão e voto único  
4. Deploy Cloudflare Pages + Supabase  

---

## Segurança do repositório

Código **público** para auditoria. Escrita e secrets **só do dono**.

- Ver [`SECURITY.md`](./SECURITY.md)
- Não commitar `.env` (usar [`.env.example`](./.env.example))
- Contribuições externas: **fork → PR** (sem write no repo principal)

## Licença

A definir (MIT ou AGPL-3.0). Código público e auditável desde o primeiro dia.

**A Voto** — Bancada Cidadã · projecto independente
