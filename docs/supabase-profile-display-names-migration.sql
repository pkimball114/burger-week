alter table public.profiles enable row level security;

drop policy if exists "authenticated read profiles" on public.profiles;
create policy "authenticated read profiles"
on public.profiles for select
to authenticated
using (true);

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
