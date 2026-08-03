# Segurança e governação do repositório

## O que é público (open source)

- Código-fonte, issues e pull requests **públicos** (auditoria e contribuição via PR).
- Qualquer pessoa pode **ler**, **forkar** e **propor** alterações (PR).

## O que só o dono controla

| Recurso | Quem |
|---------|------|
| Push directo a `main` | Só o dono do repo (`antunesales-dev`) |
| Merge de PRs | Só o dono |
| Collaborators com write | **Ninguém** convidado por omissão — não adicionar sem necessidade |
| GitHub Actions secrets | Só o dono (Settings → Secrets) |
| Deploy keys / tokens | Só o dono |
| Alterar rulesets / settings | Só o dono |
| Cloudflare / Supabase / chaves API | Fora do GitHub — só contas do dono |

**Open source ≠ qualquer um escreve no teu repo.**  
Código público, **controlo de escrita e segredos privados**.

## Protecções activas

1. **Ruleset em `main`:** proibido force-push e apagar o branch.
2. **Secret scanning + push protection:** o GitHub bloqueia commits com secrets conhecidos.
3. **Dependabot security updates:** alertas de dependências vulneráveis.
4. **Actions `GITHUB_TOKEN`:** permissões por omissão **read-only** (não eleva write em workflows sem configuração explícita).
5. **`.gitignore`:** `.env`, keys, `.wrangler`, credentials nunca devem ir para o git.
6. **Zero collaborators** além do dono (estado inicial).

## Como contribuir (outros)

1. Fork do repositório.
2. Branch no **teu** fork.
3. Abrir Pull Request para `main`.
4. O dono revê e, se aceitar, faz merge.

Nunca partilhes secrets em issues, PRs ou logs de CI.

## Reportar vulnerabilidades

Não abras issue pública com exploits. Contacta o maintainer de forma privada (email da conta GitHub do dono / canal que for indicado no README).

## Secrets em produção (futuro)

- Frontend: só chaves **públicas** (ex. Supabase anon key com RLS).
- Service role / tokens Cloudflare: **só** em GitHub Actions secrets, Cloudflare dashboard ou Supabase — **nunca** no código nem em `.env` commitado.
