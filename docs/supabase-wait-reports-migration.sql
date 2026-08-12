create table if not exists public.wait_reports (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  food_item_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  wait_time text not null check (wait_time in ('immediate', 'standard', 'long', 'very-long')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, food_item_id, profile_id)
);

alter table public.wait_reports enable row level security;

drop policy if exists "authenticated read wait reports" on public.wait_reports;
drop policy if exists "users insert own wait reports" on public.wait_reports;
drop policy if exists "users update own wait reports" on public.wait_reports;
drop policy if exists "users delete own wait reports" on public.wait_reports;

create policy "authenticated read wait reports"
on public.wait_reports for select
to authenticated
using (true);

create policy "users insert own wait reports"
on public.wait_reports for insert
to authenticated
with check ((select auth.uid()) = profile_id);

create policy "users update own wait reports"
on public.wait_reports for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

create policy "users delete own wait reports"
on public.wait_reports for delete
to authenticated
using ((select auth.uid()) = profile_id);

grant usage on schema public to authenticated;
grant select on public.profiles, public.wait_reports to authenticated;
grant insert, update, delete on public.wait_reports to authenticated;
