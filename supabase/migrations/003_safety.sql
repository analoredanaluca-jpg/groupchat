create table if not exists public.blocked_users (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_user_id),
  check (blocker_id <> blocked_user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default timezone('utc', now()),
  check (reporter_id <> reported_id)
);

alter table public.blocked_users enable row level security;
alter table public.reports enable row level security;

create policy "Users can view their own blocks"
  on public.blocked_users for select to authenticated using (auth.uid() = blocker_id);
create policy "Users can block profiles"
  on public.blocked_users for insert to authenticated with check (auth.uid() = blocker_id);
create policy "Users can remove their own blocks"
  on public.blocked_users for delete to authenticated using (auth.uid() = blocker_id);

create policy "Users can create reports"
  on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "Users can view their own reports"
  on public.reports for select to authenticated using (auth.uid() = reporter_id);
