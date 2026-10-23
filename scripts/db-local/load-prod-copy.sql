-- Carrega a cópia (só leitura, via SELECT) das tabelas de despesa de produção.
-- psql -v despesas_file=... -v inv_file=...
\set ON_ERROR_STOP 1
create temporary table _raw (j jsonb);
\copy _raw from program 'python3 -c "import json,sys;print(json.dumps(json.load(open(sys.argv[1]))))" /workspace/avoto-C-data/despesas.json' csv quote e'\x01' delimiter e'\x02'
insert into public.despesas_publicas select * from jsonb_populate_recordset(null::public.despesas_publicas, (select j from _raw));
truncate _raw;
\copy _raw from program 'python3 -c "import json,sys;print(json.dumps(json.load(open(sys.argv[1]))))" /workspace/avoto-C-data/investimentos.json' csv quote e'\x01' delimiter e'\x02'
insert into public.investimentos select * from jsonb_populate_recordset(null::public.investimentos, (select j from _raw));
insert into public.investimento_voto_counts (investimento_id) select id from public.investimentos on conflict do nothing;
