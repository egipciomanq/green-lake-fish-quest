create or replace function public.add_coins(_user uuid, _delta bigint, _reason text, _meta jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = public
as $$
declare bal bigint;
begin
  update public.profiles set coins = coins + _delta where id = _user and coins + _delta >= 0 returning coins into bal;
  if bal is null then raise exception 'insufficient_balance'; end if;
  insert into public.coin_ledger (user_id, delta, reason, meta) values (_user, _delta, _reason, _meta);
  return bal;
end $$;
revoke all on function public.add_coins(uuid, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.add_coins(uuid, bigint, text, jsonb) to service_role;