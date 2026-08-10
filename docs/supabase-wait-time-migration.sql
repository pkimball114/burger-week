alter table public.reviews
  add column if not exists wait_time text
  check (wait_time in ('immediate', 'standard', 'long', 'very-long'));
