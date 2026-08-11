create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  display_name text,
  email text,
  feedback_type text not null check (feedback_type in ('bug', 'feature')),
  message text not null check (length(trim(message)) > 0),
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.feedback_reports enable row level security;

drop policy if exists "users insert own feedback reports" on public.feedback_reports;
create policy "users insert own feedback reports"
on public.feedback_reports
for insert
to authenticated
with check ((select auth.uid()) = profile_id);

grant usage on schema public to authenticated;
grant insert on public.feedback_reports to authenticated;

-- Supabase projects created after the 2026 Data API exposure change may also
-- require exposing this table in Dashboard -> API -> Tables, or equivalent
-- project API settings, before browser inserts can reach it.
