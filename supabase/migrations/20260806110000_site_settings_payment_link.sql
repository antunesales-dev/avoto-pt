-- Link de doação público (Stripe Payment Link) — editável sem rebuild do front.
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  stripe_payment_link_url text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, stripe_payment_link_url)
values (1, '')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

-- Leitura pública só da linha de settings (sem writes)
create policy site_settings_select
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy site_settings_no_i
  on public.site_settings for insert to anon, authenticated with check (false);
create policy site_settings_no_u
  on public.site_settings for update to anon, authenticated using (false) with check (false);
create policy site_settings_no_d
  on public.site_settings for delete to anon, authenticated using (false);

grant select on public.site_settings to anon, authenticated;

comment on table public.site_settings is
  'Config pública mínima. stripe_payment_link_url = Payment Link Stripe (MB WAY/cartão). Escrita só service_role.';
