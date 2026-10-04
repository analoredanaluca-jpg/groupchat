create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz
);

create index if not exists messages_conversation_idx
  on public.messages (sender_id, receiver_id, created_at);

alter table public.messages enable row level security;

create policy "Users can view their own messages"
  on public.messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages as themselves"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id and sender_id <> receiver_id);

create policy "Receivers can mark messages as read"
  on public.messages for update
  to authenticated
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

alter table public.messages replica identity full;
