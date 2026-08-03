-- source=seed deixou de fazer sentido: defaults oficiais / desconhecido
alter table public.iniciativas
  alter column source set default 'unknown';

alter table public.despesas_publicas
  alter column source set default 'unknown';

alter table public.investimentos
  alter column source set default 'unknown';

-- limpeza residual (caso ainda existam)
delete from public.investimentos where source = 'seed';
delete from public.despesas_publicas where source = 'seed';
delete from public.iniciativas where source = 'seed';

comment on column public.iniciativas.source is
  'Origem do registo (ex.: ar_dados_abertos). Nunca seed em produção.';
comment on column public.despesas_publicas.source is
  'Origem (ex.: base.gov.pt). Nunca seed em produção.';
comment on column public.investimentos.source is
  'Origem (ex.: base.gov.pt). Nunca seed em produção.';
