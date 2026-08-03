# Encriptação de dados de utilizador

## Requisito

Dados relacionados com utilizadores na base **não ficam em claro** na aplicação pública da BD (tabelas `profiles` e `votos_cidadaos`).

## Camadas

| Camada | O quê | Onde |
|--------|--------|------|
| **Em trânsito** | TLS | Supabase cloud (sempre); local opcional |
| **Em repouso (disco)** | Encriptação de volumes | Supabase cloud (plataforma) |
| **Ao nível da coluna** | AES-256 (`pgcrypto` + chave no **Vault**) | Migration `20260803170000_user_data_encryption.sql` |

## O que é encriptado na coluna

| Dado | Armazenamento | Leitura |
|------|----------------|---------|
| Preferência partidária | `profiles.partido_preferencia_enc` (bytea) | RPC `get_my_profile` / `update_my_partido` |
| Sentido de voto | `votos_cidadaos.voto_enc` (bytea) | RPC `get_my_voto` / `list_my_votos` |
| Contagens públicas | `iniciativa_voto_counts` (inteiros) | Views públicas — **sem PII** |

## O que **não** está na tabela `profiles`

- **Email em claro** — removido de `public.profiles`. O email vive em `auth.users` (schema do **Supabase Auth**).
- O cliente usa `session.user.email` após login; não há cópia legível em `profiles`.

## `auth.users` (Supabase Auth)

É gerido pela plataforma Supabase (passwords com hash; PII do Auth com encriptação em repouso no cloud). **Não** reimplementamos o Auth. Não é possível “encriptar o email do Auth com a nossa chave” sem quebrar login.

## Chave

- Nome no Vault: `avoto_user_data_key`
- Gerada na migration se não existir
- Funções `private.encrypt_text` / `private.decrypt_text` — **não** expostas a `anon` / `authenticated`
- Cliente **nunca** recebe a chave

## RLS

- `profiles` e `votos_cidadaos`: **sem** select/insert/update/delete directo para `authenticated`
- Escrita/leitura de PII e votos: **só** via funções `security definer` que validam `auth.uid()`

## Produção

1. Manter projecto Supabase com SSL.
2. **Não** exportar secrets do Vault para o frontend nem para o git.
3. Backups: a chave do Vault deve ser tratada como secret de recuperação (processo Supabase / ops).
4. Rotação de chave: planear re-encrypt offline (não implementado na v1).

## Verificação rápida (SQL como superuser local)

```sql
-- ciphertext, não "favor"/"PS"
select voto_enc from votos_cidadaos limit 1;
select partido_preferencia_enc from profiles limit 1;
```
