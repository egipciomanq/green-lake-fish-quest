create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  telegram_id bigint unique,
  username text,
  display_name text,
  referral_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  referred_by uuid references public.profiles(id),
  coins bigint not null default 0,
  xp int not null default 0,
  level int not null default 1,
  baits jsonb not null default '{"worm":12,"berry":3,"premium":1,"golden":0}'::jsonb,
  chests jsonb not null default '["wood","blue"]'::jsonb,
  collection jsonb not null default '{}'::jsonb,
  world_id text not null default 'green-lake',
  last_catch_at timestamptz,
  referral_rewarded boolean not null default false,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  coins_per_usd int not null default 10000,
  min_withdraw_coins bigint not null default 50000,
  withdraw_fee_percent numeric not null default 0,
  withdrawals_enabled boolean not null default true,
  referral_bonus_coins int not null default 500,
  referral_percent numeric not null default 10,
  coins_common int not null default 5,
  coins_rare int not null default 15,
  coins_epic int not null default 50,
  coins_legendary int not null default 200,
  catch_cooldown_seconds int not null default 6,
  daily_catch_limit int not null default 300,
  maintenance boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1);
grant select on public.app_settings to anon, authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings readable" on public.app_settings for select to anon, authenticated using (true);

create table public.coin_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta bigint not null,
  reason text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.coin_ledger (user_id, created_at desc);
grant select on public.coin_ledger to authenticated;
grant all on public.coin_ledger to service_role;
alter table public.coin_ledger enable row level security;
create policy "read own ledger" on public.coin_ledger for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coins bigint not null,
  usd numeric(12,2) not null,
  address text not null,
  network text not null default 'BEP20',
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  tx_hash text,
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index on public.withdrawals (status, created_at desc);
grant select on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
alter table public.withdrawals enable row level security;
create policy "read own withdrawals" on public.withdrawals for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- profile on signup; referral code passed in user metadata 'ref'
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare ref_id uuid;
begin
  select id into ref_id from public.profiles where referral_code = nullif(new.raw_user_meta_data->>'ref', '');
  insert into public.profiles (id, telegram_id, username, display_name, referred_by)
  values (new.id, nullif(new.raw_user_meta_data->>'telegram_id','')::bigint, new.raw_user_meta_data->>'username',
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), ref_id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();