create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  birth_date date not null,
  city text not null,
  district text,
  university text not null,
  study_field text not null,
  gender text not null check (gender in ('masculin', 'feminin')),
  preferred_roommate_gender text not null check (preferred_roommate_gender in ('masculin', 'feminin', 'oricare')),
  budget_min integer not null check (budget_min >= 0),
  budget_max integer not null check (budget_max >= budget_min),
  sleep_schedule text not null check (sleep_schedule in ('devreme', 'flexibil', 'tarziu')),
  interests text[] not null default '{}',
  organization_level text check (organization_level in ('relaxat', 'echilibrat', 'organizat')),
  bio text,
  avatar_url text,
  is_verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_profile_updated_at();
