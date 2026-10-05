create table if not exists public.location_group_chats (
  id uuid primary key default gen_random_uuid(),
  city text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.location_group_chat_members (
  group_chat_id uuid not null references public.location_group_chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (group_chat_id, user_id),
  unique (user_id)
);

create table if not exists public.location_group_chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_chat_id uuid not null references public.location_group_chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists location_group_chat_messages_order_idx
  on public.location_group_chat_messages (group_chat_id, created_at);

alter table public.location_group_chats enable row level security;
alter table public.location_group_chat_members enable row level security;
alter table public.location_group_chat_messages enable row level security;

create or replace function public.is_location_group_member(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.location_group_chat_members
    where group_chat_id = target_group_id and user_id = target_user_id
  );
$$;

revoke all on function public.is_location_group_member(uuid, uuid) from public;
grant execute on function public.is_location_group_member(uuid, uuid) to authenticated;

create or replace function public.create_location_group_chat()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_city text;
  location_group_id uuid;
  existing_group_id uuid;
begin
  if current_user_id is null then
    raise exception 'Autentificarea este necesară.';
  end if;

  select city into current_city from public.profiles where id = current_user_id;
  if current_city is null then
    raise exception 'Completează profilul înainte să creezi un grup.';
  end if;

  select group_chat_id into existing_group_id
  from public.location_group_chat_members where user_id = current_user_id;
  if existing_group_id is not null then
    return existing_group_id;
  end if;

  insert into public.location_group_chats (city, created_by)
  values (current_city, current_user_id)
  on conflict (city) do nothing;

  select id into location_group_id
  from public.location_group_chats where city = current_city;

  insert into public.location_group_chat_members (group_chat_id, user_id)
  values (location_group_id, current_user_id)
  on conflict (user_id) do nothing;

  return location_group_id;
end;
$$;

revoke all on function public.create_location_group_chat() from public;
grant execute on function public.create_location_group_chat() to authenticated;

create policy "Users can view their city group"
  on public.location_group_chats for select to authenticated
  using (
    city = (select city from public.profiles where id = auth.uid())
    or public.is_location_group_member(id, auth.uid())
  );

create policy "Users can view city group members"
  on public.location_group_chat_members for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.location_group_chats gc
      where gc.id = group_chat_id
        and gc.city = (select city from public.profiles where id = auth.uid())
    )
    or public.is_location_group_member(group_chat_id, auth.uid())
  );

create policy "Users can join their city group"
  on public.location_group_chat_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.location_group_chats gc
      where gc.id = group_chat_id
        and gc.city = (select city from public.profiles where id = auth.uid())
    )
  );

create policy "Group members can invite matched people in the same city"
  on public.location_group_chat_members for insert to authenticated
  with check (
    public.is_location_group_member(group_chat_id, auth.uid())
    and exists (
      select 1
      from public.location_group_chats gc
      join public.profiles invitee on invitee.id = user_id
      where gc.id = group_chat_id and gc.city = invitee.city
    )
    and exists (
      select 1
      from public.matches first_match
      join public.matches second_match
        on second_match.user_id = first_match.matched_user_id
       and second_match.matched_user_id = first_match.user_id
      where first_match.user_id = auth.uid()
        and first_match.matched_user_id = location_group_chat_members.user_id
        and first_match.status = 'matched'
        and second_match.status = 'matched'
    )
  );

create policy "Users can leave their group"
  on public.location_group_chat_members for delete to authenticated
  using (user_id = auth.uid());

create policy "Group members can read group messages"
  on public.location_group_chat_messages for select to authenticated
  using (public.is_location_group_member(group_chat_id, auth.uid()));

create policy "Group members can send group messages"
  on public.location_group_chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_location_group_member(group_chat_id, auth.uid())
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'location_group_chat_messages'
     ) then
    alter publication supabase_realtime add table public.location_group_chat_messages;
  end if;
end;
$$;
