-- Corpo do comunicado (texto oficial extraído da fonte) para leitura na app.
alter table public.comunicados
  add column if not exists corpo text not null default '';

comment on column public.comunicados.corpo is
  'Texto principal do comunicado (extraído de portugal.gov.pt). Exibição na app; fonte canónica = url_oficial.';
