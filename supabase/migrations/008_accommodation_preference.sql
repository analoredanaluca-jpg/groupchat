alter table public.profiles
  add column if not exists accommodation_preference text not null default 'camin'
  check (accommodation_preference in ('camin', 'chirie', 'deja_am_chirie', 'doar_coleg'));
