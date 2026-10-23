# Ficha da iniciativa: contexto oficial e layout em 2 colunas

## O que muda
- **Dados AR (sync):** as petições associadas, as iniciativas de origem e as originadas, o aviso de texto substituído, as datas da apreciação pública e as datas das audições (em `comissao`).
- **Texto oficial (`iniciativa_textos`):** excertos **literais** do `IniLinkTexto`: exposição de motivos, Artigo 1.º, articulado de topo e parte dispositiva. São extraídos por `scripts/extract-textos-ar.mjs`, sem LLM nem serviços pagos. A UI mostra sempre a fonte e o link.
- **Mesmo assunto:** a RPC `iniciativas_relacionadas(id)` usa pg_trgm, filtrando pelo mesmo tema. Aparece com o rótulo de sugestão automática.
- **UI:** 2 colunas a partir dos 1024 px (até 1240 px de largura).
  - À esquerda: Em resumo, O que propõe, Exposição de motivos, Articulado, Percurso compacto, Votações, Debate, Documentos agrupados, Petições/Dossiê/Mesmo assunto, Governo, Peso, Alinhamento.
  - À direita, fixa ao fazer scroll: Voto dos cidadãos, Voto dos partidos (grelha compacta) e Ligações.
  - Em telemóvel fica tudo numa coluna, com o voto logo a seguir ao cabeçalho.

## Rollout (por esta ordem)
1. **Migração:** `supabase/migrations/20261023170000_ficha_contexto_texto_oficial.sql`.
   - É aditiva e idempotente: colunas novas com default, tabela nova, RPC nova, e o upsert recriado com os mesmos campos mais os novos.
   - Não reescreve linhas existentes, por isso é rápida.
2. **Deploy do site:** acontece com o merge em `main` (deploy-cloudflare-prod).
   - A ficha funciona antes do backfill: sem texto, mostra o link "Ler o texto na AR".
3. **Sync AR:** o "Sync diário" do GitHub preenche as colunas novas. Para não esperar pelo dia seguinte, corre-se à mão com `workflow_dispatch`.
   - Os payloads antigos (edge `ar-sync`) não apagam o que já foi gravado, porque o upsert usa `p ? 'chave'`.
4. **Backfill dos textos:** `workflow_dispatch` do "Sync diário" com `textos_limit=all`.
   - Ou localmente, com os secrets: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/extract-textos-ar.mjs --limit=all --concurrency=3`.
   - Demora cerca de 20–25 min para 2,3 mil textos e escreve lotes de 25 linhas por upsert, longe do `statement_timeout` de 8 s.
   - É idempotente: se for interrompido, a execução seguinte retoma.
5. **Depois disso:** o sync diário extrai só as iniciativas novas, as que têm o URL do texto alterado e as que deram erro há mais de 24 h (até 150 por dia). Esse passo tem `continue-on-error`, para não parar o resto do sync.

Nenhuma edge function precisa de deploy. A `ar-sync` pode ser redeployada mais tarde para também enviar os campos novos, mas o sync Node é o principal.

## Rollback
- **UI:** reverter o commit; o deploy é automático.
- **Dados:** a tabela `iniciativa_textos` e as colunas novas são aditivas, e o código antigo ignora-as.
  - Se for mesmo preciso: `drop table public.iniciativa_textos; drop function public.iniciativas_relacionadas(text, integer);`
  - E reaplicar a função `upsert_iniciativa_from_ar` de `20261023120000`. As colunas novas podem ficar.

## Testes
- `pnpm test`: mapper, extrator (com um .docx de fixture) e helpers da ficha.
- `pnpm test:deno`.
- `psql -f supabase/tests/ficha_contexto.sql`: upsert com e sem as chaves novas, RLS, relacionadas e cascade.
