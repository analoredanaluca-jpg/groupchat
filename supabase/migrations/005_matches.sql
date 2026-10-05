create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  matched_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'matched')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, matched_user_id),
  check (user_id <> matched_user_id)
);

create index if not exists matches_user_idx
  on public.matches (user_id, matched_user_id, status);

create index if not exists matches_target_idx
  on public.matches (matched_user_id, user_id, status);

alter table public.matches enable row level security;

create policy "Users can view matches involving them"
  on public.matches for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() = matched_user_id);

create policy "Users can create their own match requests"
  on public.matches for insert
  to authenticated
  with check (auth.uid() = user_id and user_id <> matched_user_id);

create policy "Users can update matches involving them"
  on public.matches for update
  to authenticated
  using (auth.uid() = user_id or auth.uid() = matched_user_id)
  with check (auth.uid() = user_id or auth.uid() = matched_user_id);

create or replace function public.set_match_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists matches_updated_at on public.matches;
create trigger matches_updated_at
before update on public.matches
for each row execute procedure public.set_match_updated_at();
