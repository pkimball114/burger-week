alter table public.reviews
  add column if not exists boob integer;

notify pgrst, 'reload schema';
