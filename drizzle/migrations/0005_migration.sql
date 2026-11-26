create or replace function public.grant_owner_admin()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if lower(new.email) = 'ahmed@f.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users for each row execute function public.grant_owner_admin();
insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where lower(email) = 'ahmed@f.com' on conflict do nothing;