-- Preferências de notificação (digest, votações, investimentos)
-- Push Web: subscriptions (VAPID a configurar em produção)

create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  notify_digest boolean not null default true,
  notify_iniciativas boolean not null default true,
  notify_investimentos boolean not null default true,
  notify_despesa boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy notif_prefs_select_own
  on public.notification_prefs for select
  to authenticated
  using (user_id = auth.uid());

create policy notif_prefs_insert_own
  on public.notification_prefs for insert
  to authenticated
  with check (user_id = auth.uid());

create policy notif_prefs_update_own
  on public.notification_prefs for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.notification_prefs to authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy push_sub_select_own
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy push_sub_insert_own
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy push_sub_delete_own
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

create policy push_sub_update_own
  on public.push_subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- defaults ao criar perfil
create or replace function public.ensure_notification_prefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_prefs (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_notif_prefs on public.profiles;
create trigger on_profile_notif_prefs
  after insert on public.profiles
  for each row
  execute function public.ensure_notification_prefs();

-- backfill
insert into public.notification_prefs (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- Realtime para notificações in-app (digest, leis/votações, investimentos)
do $$
begin
  begin
    alter publication supabase_realtime add table public.daily_digests;
  exception when duplicate_object then null; when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.iniciativas;
  exception when duplicate_object then null; when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.investimentos;
  exception when duplicate_object then null; when undefined_object then null;
  end;
end;
$$;

alter table public.daily_digests replica identity full;
alter table public.iniciativas replica identity full;
alter table public.investimentos replica identity full;
