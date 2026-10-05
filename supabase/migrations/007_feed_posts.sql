create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 1000 and char_length(trim(body)) >= 1),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists feed_posts_created_at_idx
  on public.feed_posts (created_at desc);

alter table public.feed_posts enable row level security;

create policy "Authenticated users can view feed posts"
  on public.feed_posts for select
  to authenticated
  using (true);

create policy "Users can create their own feed posts"
  on public.feed_posts for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Users can delete their own feed posts"
  on public.feed_posts for delete
  to authenticated
  using (auth.uid() = author_id);
