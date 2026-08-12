create table if not exists public.review_likes (
  event_id text not null,
  review_id uuid not null references public.reviews(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, review_id, profile_id)
);

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  review_id uuid not null references public.reviews(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  food_item_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  visit_date date not null,
  visit_time time not null,
  status text not null default 'planned' check (status in ('planned', 'visited')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.review_likes enable row level security;
alter table public.review_comments enable row level security;
alter table public.schedule_entries enable row level security;

drop policy if exists "authenticated read review likes" on public.review_likes;
drop policy if exists "users insert own review likes" on public.review_likes;
drop policy if exists "users delete own review likes" on public.review_likes;
drop policy if exists "authenticated read review comments" on public.review_comments;
drop policy if exists "users insert own review comments" on public.review_comments;
drop policy if exists "users delete own review comments" on public.review_comments;
drop policy if exists "authenticated read schedules" on public.schedule_entries;
drop policy if exists "users insert own schedules" on public.schedule_entries;
drop policy if exists "users update own schedules" on public.schedule_entries;
drop policy if exists "users delete own schedules" on public.schedule_entries;

create policy "authenticated read review likes" on public.review_likes for select to authenticated using (true);
create policy "users insert own review likes" on public.review_likes for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "users delete own review likes" on public.review_likes for delete to authenticated using ((select auth.uid()) = profile_id);
create policy "authenticated read review comments" on public.review_comments for select to authenticated using (true);
create policy "users insert own review comments" on public.review_comments for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "users delete own review comments" on public.review_comments for delete to authenticated using ((select auth.uid()) = profile_id);
create policy "authenticated read schedules" on public.schedule_entries for select to authenticated using (true);
create policy "users insert own schedules" on public.schedule_entries for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "users update own schedules" on public.schedule_entries for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "users delete own schedules" on public.schedule_entries for delete to authenticated using ((select auth.uid()) = profile_id);

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select on public.review_likes, public.review_comments, public.schedule_entries to authenticated;
grant insert, delete on public.review_likes, public.review_comments to authenticated;
grant insert, update, delete on public.schedule_entries to authenticated;
