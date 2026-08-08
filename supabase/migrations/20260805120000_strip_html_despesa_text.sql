-- Portal Base / SNS: tipos_de_contrato vinha com <br/> literal.
-- Leigos leem "br" como Brasil. Limpar registos já importados.

update public.despesas_publicas
set
  titulo = trim(both from regexp_replace(
    regexp_replace(coalesce(titulo, ''), '<br\s*/?>', ' · ', 'gi'),
    '<[^>]+>', '', 'g'
  )),
  categoria = trim(both from regexp_replace(
    regexp_replace(coalesce(categoria, ''), '<br\s*/?>', ' · ', 'gi'),
    '<[^>]+>', '', 'g'
  )),
  descricao = trim(both from regexp_replace(
    regexp_replace(coalesce(descricao, ''), '<br\s*/?>', ' · ', 'gi'),
    '<[^>]+>', '', 'g'
  )),
  entidade = trim(both from regexp_replace(
    regexp_replace(coalesce(entidade, ''), '<br\s*/?>', ' · ', 'gi'),
    '<[^>]+>', '', 'g'
  )),
  updated_at = now()
where titulo ~* '<br|</?[a-z]'
   or categoria ~* '<br|</?[a-z]'
   or descricao ~* '<br|</?[a-z]'
   or entidade ~* '<br|</?[a-z]';

update public.investimentos
set
  titulo = trim(both from regexp_replace(
    regexp_replace(coalesce(titulo, ''), '<br\s*/?>', ' · ', 'gi'),
    '<[^>]+>', '', 'g'
  )),
  descricao = trim(both from regexp_replace(
    regexp_replace(coalesce(descricao, ''), '<br\s*/?>', ' · ', 'gi'),
    '<[^>]+>', '', 'g'
  )),
  entidade = trim(both from regexp_replace(
    regexp_replace(coalesce(entidade, ''), '<br\s*/?>', ' · ', 'gi'),
    '<[^>]+>', '', 'g'
  )),
  sector = trim(both from regexp_replace(
    regexp_replace(coalesce(sector, ''), '<br\s*/?>', ' · ', 'gi'),
    '<[^>]+>', '', 'g'
  )),
  updated_at = now()
where titulo ~* '<br|</?[a-z]'
   or descricao ~* '<br|</?[a-z]'
   or entidade ~* '<br|</?[a-z]'
   or sector ~* '<br|</?[a-z]';

-- Colapsar " ·  · " e espaços
update public.despesas_publicas
set
  descricao = trim(both from regexp_replace(regexp_replace(descricao, '( · ){2,}', ' · ', 'g'), '\s+', ' ', 'g')),
  categoria = trim(both from regexp_replace(regexp_replace(categoria, '( · ){2,}', ' · ', 'g'), '\s+', ' ', 'g'))
where descricao like '% ·  · %' or categoria like '% ·  · %';

update public.investimentos
set
  descricao = trim(both from regexp_replace(regexp_replace(descricao, '( · ){2,}', ' · ', 'g'), '\s+', ' ', 'g')),
  sector = trim(both from regexp_replace(regexp_replace(sector, '( · ){2,}', ' · ', 'g'), '\s+', ' ', 'g'))
where descricao like '% ·  · %' or sector like '% ·  · %';
