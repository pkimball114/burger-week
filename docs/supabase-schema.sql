create extension if not exists pgcrypto;

create table public.events (
  id text primary key,
  title text not null,
  city text not null,
  starts_on date not null,
  ends_on date not null,
  price_label text,
  source_url text,
  archived_at timestamptz
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.food_items (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  restaurant text not null,
  item_name text not null,
  neighborhood text,
  address text,
  latitude double precision,
  longitude double precision,
  tags text[] not null default '{}',
  restaurant_photo_path text,
  photo_alt text,
  maps_url text,
  everout_url text,
  available_start date,
  available_end date,
  hours_note text
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  food_item_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  rating numeric(3, 2) not null check (rating >= 0 and rating <= 5 and mod(rating * 100, 25) = 0),
  notes text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wants (
  event_id text not null,
  food_item_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, food_item_id, profile_id)
);

create table public.hidden_food_items (
  event_id text not null,
  food_item_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, food_item_id, profile_id)
);

alter table public.events enable row level security;
alter table public.profiles enable row level security;
alter table public.food_items enable row level security;
alter table public.reviews enable row level security;
alter table public.wants enable row level security;
alter table public.hidden_food_items enable row level security;

create policy "authenticated read events" on public.events for select to authenticated using (true);
create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);
create policy "authenticated read food items" on public.food_items for select to authenticated using (true);
create policy "authenticated read reviews" on public.reviews for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "users insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "users insert own reviews" on public.reviews for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "users update own reviews" on public.reviews for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "users delete own reviews" on public.reviews for delete to authenticated using ((select auth.uid()) = profile_id);
create policy "authenticated read wants" on public.wants for select to authenticated using (true);
create policy "users insert own wants" on public.wants for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "users delete own wants" on public.wants for delete to authenticated using ((select auth.uid()) = profile_id);
create policy "users read own hidden food items" on public.hidden_food_items for select to authenticated using ((select auth.uid()) = profile_id);
create policy "users insert own hidden food items" on public.hidden_food_items for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "users delete own hidden food items" on public.hidden_food_items for delete to authenticated using ((select auth.uid()) = profile_id);

grant usage on schema public to authenticated;
grant select on public.events, public.profiles, public.food_items, public.reviews, public.wants to authenticated;
grant select, insert, update on public.profiles, public.reviews to authenticated;
grant delete on public.reviews to authenticated;
grant insert, delete on public.wants, public.hidden_food_items to authenticated;
grant select on public.hidden_food_items to authenticated;

insert into storage.buckets (id, name, public)
values ('burger-review-photos', 'burger-review-photos', false)
on conflict (id) do nothing;

create policy "authenticated read review photos"
on storage.objects for select
to authenticated
using (bucket_id = 'burger-review-photos');

create policy "users upload own review photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'burger-review-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "users update own review photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'burger-review-photos'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'burger-review-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "users delete own review photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'burger-review-photos'
  and owner_id = (select auth.uid()::text)
);
