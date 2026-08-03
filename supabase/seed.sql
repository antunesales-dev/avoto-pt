-- Seed local opcional: VAZIO de propósito.
-- Em produção e em dev com dados reais, o conteúdo vem de:
--   node scripts/sync-ar.mjs --limit=all
--   edge despesa-sync
--   node scripts/generate-digests.mjs
--
-- Não inserir iniciativas/despesas/investimentos fictícios com source=seed.
-- (supabase db reset local arranca limpo; corre os syncs se precisares de dados.)

select 1;
