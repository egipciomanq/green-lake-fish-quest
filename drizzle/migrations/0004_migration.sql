alter table public.profiles
  add column pending_catch jsonb,
  add column coins_today int not null default 0,
  add column coins_day date not null default current_date,
  add column referral_earned bigint not null default 0,
  add column total_earned bigint not null default 0;