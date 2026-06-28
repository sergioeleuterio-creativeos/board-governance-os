-- Board Governance OS auth bootstrap helpers.

create or replace function public.check_user_email_exists(check_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(check_email)
  );
$$;

grant execute on function public.check_user_email_exists(text) to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    full_name,
    locale,
    timezone,
    status
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'pt-BR',
    'America/Sao_Paulo',
    'active'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.user_profiles.full_name, excluded.full_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
