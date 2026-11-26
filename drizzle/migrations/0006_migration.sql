alter table public.app_settings alter column min_account_days set default 0;
update public.app_settings set min_account_days = 0 where id = 1;