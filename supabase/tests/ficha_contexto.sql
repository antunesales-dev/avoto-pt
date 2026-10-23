-- Testes SQL da migração 20261023170000 (BD LOCAL com as migrações aplicadas):
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ficha_contexto.sql
-- Tudo numa transação revertida no fim; não depende de dados existentes.
begin;

do $$
declare v jsonb;
begin
  -- 1) upsert com as chaves novas grava; payload parcial (sem as chaves) não apaga
  perform public.upsert_iniciativa_from_ar(jsonb_build_object(
    'id', 't-fc-1', 'id_oficial', 'J 9901 XVII', 'titulo', 'Alargamento da licença parental inicial para seis meses',
    'tipo', 'Projeto de Lei', 'legislatura', 'XVII', 'estado', 'aprovado', 'tema', 'Trabalho e Segurança Social',
    'peticoes', '[{"numero":"12","legislatura":"XVII","assunto":"Licenças","url":null,"conjunta":true}]'::jsonb,
    'iniciativas_origem', '[{"ar_ini_id":"1","id_oficial":"I 2 XVII"}]'::jsonb,
    'iniciativas_originadas', '[]'::jsonb,
    'texto_substituido', 'Substituição do texto a pedido do autor'));
  select to_jsonb(i) into v from public.iniciativas i where id = 't-fc-1';
  assert jsonb_array_length(v -> 'peticoes') = 1, 'peticoes não gravadas';
  assert v ->> 'texto_substituido' = 'Substituição do texto a pedido do autor', 'texto_substituido';
  perform public.upsert_iniciativa_from_ar(jsonb_build_object(
    'id', 't-fc-1', 'id_oficial', 'J 9901 XVII', 'titulo', 'Alargamento da licença parental inicial para seis meses',
    'tipo', 'Projeto de Lei', 'legislatura', 'XVII', 'estado', 'aprovado', 'tema', 'Trabalho e Segurança Social'));
  select to_jsonb(i) into v from public.iniciativas i where id = 't-fc-1';
  assert jsonb_array_length(v -> 'peticoes') = 1, 'payload parcial apagou peticoes';
  assert jsonb_array_length(v -> 'iniciativas_origem') = 1, 'payload parcial apagou origem';
  assert v ->> 'texto_substituido' is not null, 'payload parcial apagou texto_substituido';
  -- payload com a chave vazia limpa (a AR deixou de a indicar)
  perform public.upsert_iniciativa_from_ar(jsonb_build_object(
    'id', 't-fc-1', 'id_oficial', 'J 9901 XVII', 'titulo', 'Alargamento da licença parental inicial para seis meses',
    'tipo', 'Projeto de Lei', 'legislatura', 'XVII', 'estado', 'aprovado', 'tema', 'Trabalho e Segurança Social',
    'peticoes', '[]'::jsonb, 'texto_substituido', null));
  select to_jsonb(i) into v from public.iniciativas i where id = 't-fc-1';
  assert jsonb_array_length(v -> 'peticoes') = 0, 'peticoes [] não limpou';
  assert v ->> 'texto_substituido' is null, 'texto_substituido null não limpou';
  raise notice 'OK upsert campos novos';
end $$;

-- 2) texto oficial: o upsert do sync nunca toca na tabela; apagar a iniciativa apaga o texto
insert into public.iniciativas (id, id_oficial, titulo, tipo, legislatura, autores, estado, tema, dossie_id)
values ('t-fc-2', 'J 9902 XVII', 'Alarga a licença parental inicial e reforça os períodos exclusivos', 'Projeto de Lei', 'XVII', '{JPP}', 'rejeitado', 'Trabalho e Segurança Social', null),
       ('t-fc-3', 'J 9903 XVII', 'Alarga a licença parental inicial do pai', 'Projeto de Lei', 'XVII', '{PS}', 'em_discussao', 'Trabalho e Segurança Social', 'dossie-x'),
       ('t-fc-4', 'J 9904 XVII', 'Alarga a licença parental inicial da mãe', 'Projeto de Lei', 'XVII', '{PS}', 'em_discussao', 'Trabalho e Segurança Social', 'dossie-x'),
       ('t-fc-5', 'R 9905 XVII', 'Recomenda a requalificação da escola básica de Lousada', 'Projeto de Resolução', 'XVII', '{PS}', 'em_discussao', 'Educação e Ciência', null);
insert into public.iniciativa_textos (iniciativa_id, fonte_url, formato, estado, exposicao, objeto, artigos)
values ('t-fc-1', 'https://app.parlamento.pt/x', 'docx', 'ok', '["Motivo."]', 'A presente lei…', '[{"n":1,"epigrafe":"Objeto"}]'),
       ('t-fc-2', 'https://app.parlamento.pt/y', 'docx', 'erro', '[]', null, '[]');

do $$
begin
  perform public.upsert_iniciativa_from_ar(jsonb_build_object('id', 't-fc-1', 'titulo', 'Alargamento da licença parental inicial para seis meses', 'tema', 'Trabalho e Segurança Social'));
  assert (select objeto from public.iniciativa_textos where iniciativa_id = 't-fc-1') = 'A presente lei…', 'sync apagou o texto';
  raise notice 'OK texto independente do sync';
end $$;

-- 3) RLS: anon só lê estado = ok e não escreve
set local role anon;
do $$
declare n int;
begin
  select count(*) into n from public.iniciativa_textos where iniciativa_id in ('t-fc-1', 't-fc-2');
  assert n = 1, format('anon devia ver só o texto ok (viu %s)', n);
  begin
    insert into public.iniciativa_textos (iniciativa_id, estado) values ('t-fc-5', 'ok');
    raise exception 'anon conseguiu inserir';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.iniciativa_textos set objeto = 'x' where iniciativa_id = 't-fc-1';
    if found then raise exception 'anon conseguiu alterar'; end if;
  exception when insufficient_privilege then null;
  end;
  raise notice 'OK RLS iniciativa_textos';
end $$;

-- 4) relacionadas: mesmo tema + título semelhante; exclui a própria, procedimentos e o mesmo dossiê
do $$
declare ids text[];
begin
  select array_agg(id order by score desc) into ids from public.iniciativas_relacionadas('t-fc-2', 6);
  assert 't-fc-1' = any(ids), 'devia sugerir t-fc-1';
  assert not ('t-fc-2' = any(ids)), 'sugeriu a própria';
  assert not ('t-fc-5' = any(ids)), 'sugeriu outro tema';
  select array_agg(id) into ids from public.iniciativas_relacionadas('t-fc-3', 6);
  assert not ('t-fc-4' = any(coalesce(ids, '{}'))), 'sugeriu o mesmo dossiê';
  assert (select count(*) from public.iniciativas_relacionadas('nao-existe')) = 0, 'id inexistente devolve linhas';
  raise notice 'OK iniciativas_relacionadas (anon)';
end $$;
reset role;

delete from public.iniciativas where id = 't-fc-1';
do $$ begin
  assert not exists (select 1 from public.iniciativa_textos where iniciativa_id = 't-fc-1'), 'cascade falhou';
  raise notice 'OK cascade';
end $$;

rollback;
