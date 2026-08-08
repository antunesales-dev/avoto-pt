-- Financiamento transparente: entradas (doações) e saídas (infra + maintainer).
-- Público: valor, data, tag (CID ou Anónimo). Nunca email/IBAN/telefone na API.

-- ---------------------------------------------------------------------------
-- Doações (ledger de entradas)
-- ---------------------------------------------------------------------------
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  amount_eur numeric(12, 2) not null check (amount_eur > 0),
  donated_on date not null default (timezone('utc', now()))::date,
  -- Público: "Anónimo" ou CID-XXXXXX se o doador optou
  display_tag text not null default 'Anónimo'
    check (char_length(display_tag) between 1 and 40),
  public_note text not null default '',
  -- Privado (só service_role)
  stripe_event_id text unique,
  stripe_payment_id text,
  stripe_checkout_session_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists donations_donated_on_idx
  on public.donations (donated_on desc, created_at desc);

comment on table public.donations is
  'Doações ao projecto. Colunas Stripe/meta só service_role; público via RPC.';

alter table public.donations enable row level security;

-- Sem SELECT directo na tabela para anon/authenticated (evita vazar stripe_*)
create policy donations_no_select_client
  on public.donations for select to anon, authenticated using (false);
create policy donations_no_insert_client
  on public.donations for insert to anon, authenticated with check (false);
create policy donations_no_update_client
  on public.donations for update to anon, authenticated using (false) with check (false);
create policy donations_no_delete_client
  on public.donations for delete to anon, authenticated using (false);

-- ---------------------------------------------------------------------------
-- Saídas públicas (infra vs trabalho do maintainer)
-- ---------------------------------------------------------------------------
create table if not exists public.project_outflows (
  id uuid primary key default gen_random_uuid(),
  amount_eur numeric(12, 2) not null check (amount_eur > 0),
  spent_on date not null default (timezone('utc', now()))::date,
  kind text not null check (kind in ('infra', 'maintainer')),
  label text not null check (char_length(label) between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists project_outflows_spent_on_idx
  on public.project_outflows (spent_on desc, created_at desc);

comment on table public.project_outflows is
  'Despesas públicas do projecto: infra (serviços) ou maintainer (trabalho pago).';

alter table public.project_outflows enable row level security;

create policy outflows_select_all
  on public.project_outflows for select to anon, authenticated using (true);
create policy outflows_no_write_i
  on public.project_outflows for insert to anon, authenticated with check (false);
create policy outflows_no_write_u
  on public.project_outflows for update to anon, authenticated using (false) with check (false);
create policy outflows_no_write_d
  on public.project_outflows for delete to anon, authenticated using (false);

grant select on public.project_outflows to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: ledger público de doações (sem colunas Stripe)
-- ---------------------------------------------------------------------------
create or replace function public.list_donations_ledger()
returns table (
  id uuid,
  amount_eur numeric,
  donated_on date,
  display_tag text,
  public_note text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.amount_eur, d.donated_on, d.display_tag, d.public_note, d.created_at
  from public.donations d
  order by d.donated_on desc, d.created_at desc
  limit 500;
$$;

revoke all on function public.list_donations_ledger() from public;
grant execute on function public.list_donations_ledger() to anon, authenticated, service_role;

create or replace function public.financiamento_resumo()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_in', coalesce((select sum(amount_eur) from public.donations), 0),
    'total_out_infra', coalesce((select sum(amount_eur) from public.project_outflows where kind = 'infra'), 0),
    'total_out_maintainer', coalesce((select sum(amount_eur) from public.project_outflows where kind = 'maintainer'), 0),
    'total_out', coalesce((select sum(amount_eur) from public.project_outflows), 0),
    'balance',
      coalesce((select sum(amount_eur) from public.donations), 0)
      - coalesce((select sum(amount_eur) from public.project_outflows), 0),
    'n_donations', (select count(*)::int from public.donations),
    'n_outflows', (select count(*)::int from public.project_outflows)
  );
$$;

revoke all on function public.financiamento_resumo() from public;
grant execute on function public.financiamento_resumo() to anon, authenticated, service_role;

-- Inserir doação (só service_role — webhook Stripe ou ops)
create or replace function public.record_donation(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_tag text;
  v_amount numeric;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_amount := nullif(p ->> 'amount_eur', '')::numeric;
  if v_amount is null or v_amount <= 0 then
    raise exception 'AMOUNT_REQUIRED';
  end if;

  v_tag := nullif(trim(coalesce(p ->> 'display_tag', '')), '');
  if v_tag is null then
    v_tag := 'Anónimo';
  end if;
  -- Nunca aceitar emails como tag
  if v_tag ~* '@' then
    v_tag := 'Anónimo';
  end if;
  v_tag := left(v_tag, 40);

  insert into public.donations (
    amount_eur,
    donated_on,
    display_tag,
    public_note,
    stripe_event_id,
    stripe_payment_id,
    stripe_checkout_session_id,
    meta
  ) values (
    v_amount,
    coalesce(nullif(p ->> 'donated_on', '')::date, (timezone('utc', now()))::date),
    v_tag,
    left(coalesce(p ->> 'public_note', ''), 200),
    nullif(p ->> 'stripe_event_id', ''),
    nullif(p ->> 'stripe_payment_id', ''),
    nullif(p ->> 'stripe_checkout_session_id', ''),
    coalesce(p -> 'meta', '{}'::jsonb)
  )
  on conflict (stripe_event_id) do update set
    -- idempotente: se o evento já existe, devolve o id existente
    amount_eur = excluded.amount_eur
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_donation(jsonb) from public, anon, authenticated;
grant execute on function public.record_donation(jsonb) to service_role;
