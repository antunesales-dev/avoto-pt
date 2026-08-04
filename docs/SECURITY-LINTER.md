# Security advisor (Supabase)

## O que já está resolvido em SQL

RPCs de app (`cast_voto`, `get_my_*`, `platform_health`, …) usam **`SECURITY INVOKER`**:
correm com os privilégios do caller + RLS (só linhas próprias).

Elevação controlada fica no schema **`private`** (crypto, rate-limit, triggers de contagem),
**não exposto** no PostgREST — o linter 0028/0029 não aplica.

`ensure_notification_prefs` continua DEFINER (trigger em signup) mas **sem EXECUTE**
para `anon` / `authenticated`.

## Leaked Password Protection (HaveIBeenPwned)

Aviso `auth_leaked_password_protection`: **só no plano Pro+** da Supabase Auth.

Activar no dashboard (não é migration SQL):

1. [Auth → Providers → Email](https://supabase.com/dashboard/project/qevavihconurfgmayzze/auth/providers?provider=Email)
2. Password strength → **Leaked password protection** → On

Docs: https://supabase.com/docs/guides/auth/password-security

No free tier o toggle não está disponível; o aviso no advisor permanece até upgrade
ou até activares no Pro.
