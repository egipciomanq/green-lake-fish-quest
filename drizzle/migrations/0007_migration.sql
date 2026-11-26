alter table public.app_settings
  add column adsgram_block_id text not null default '',
  add column ad_reward_baits int not null default 3,
  add column ad_reward_coins int not null default 0,
  add column ad_daily_limit int not null default 10,
  add column ad_cooldown_seconds int not null default 45;
alter table public.profiles
  add column ads_today int not null default 0,
  add column last_ad_at timestamptz;