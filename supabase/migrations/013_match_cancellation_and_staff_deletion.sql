-- Keep cancelled conversations readable, but do not allow new messages.
alter table public.matches
  drop constraint if exists matches_status_check;

alter table public.matches
  add constraint matches_status_check
  check (status in ('pending', 'matched', 'cancelled'));

create or replace function public.cancel_match(other_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_type text;
  changed_rows integer;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;
  if other_user_id is null or other_user_id = actor_id then
    raise exception 'Invalid match';
  end if;

  select account_type into actor_type from public.profiles where id = actor_id;
  if actor_type is distinct from 'member' then
    raise exception 'Only members can cancel matches';
  end if;

  if (select count(*) from public.matches
      where ((user_id = actor_id and matched_user_id = other_user_id)
          or (user_id = other_user_id and matched_user_id = actor_id))
        and status = 'matched') <> 2 then
    raise exception 'An active mutual match was not found';
  end if;

  update public.matches
     set status = 'cancelled'
   where ((user_id = actor_id and matched_user_id = other_user_id)
       or (user_id = other_user_id and matched_user_id = actor_id))
     and status = 'matched';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then
    raise exception 'The match could not be cancelled';
  end if;
end;
$$;

revoke all on function public.cancel_match(uuid) from public;
grant execute on function public.cancel_match(uuid) to authenticated;

create or replace function public.staff_delete_match(first_user_id uuid, second_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_type text;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;
  if first_user_id is null or second_user_id is null or first_user_id = second_user_id then
    raise exception 'Invalid match';
  end if;

  select account_type into actor_type from public.profiles where id = actor_id;
  if actor_type is distinct from 'staff' then
    raise exception 'Staff access required';
  end if;

  if (select count(*) from public.matches
      where ((user_id = first_user_id and matched_user_id = second_user_id)
          or (user_id = second_user_id and matched_user_id = first_user_id))
        and status = 'matched') <> 2 then
    raise exception 'A confirmed mutual match was not found';
  end if;

  delete from public.messages
   where (sender_id = first_user_id and receiver_id = second_user_id)
      or (sender_id = second_user_id and receiver_id = first_user_id);

  delete from public.matches
   where (user_id = first_user_id and matched_user_id = second_user_id)
      or (user_id = second_user_id and matched_user_id = first_user_id);
end;
$$;

revoke all on function public.staff_delete_match(uuid, uuid) from public;
grant execute on function public.staff_delete_match(uuid, uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'matches'
     ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end;
$$;

drop policy if exists "Matched users can view their messages" on public.messages;
create policy "Matched and cancelled users can view their messages"
  on public.messages for select
  to authenticated
  using (
    (auth.uid() = sender_id or auth.uid() = receiver_id)
    and exists (
      select 1
      from public.matches sender_match
      join public.matches receiver_match
        on receiver_match.user_id = sender_match.matched_user_id
       and receiver_match.matched_user_id = sender_match.user_id
      where sender_match.user_id = messages.sender_id
        and sender_match.matched_user_id = messages.receiver_id
        and sender_match.status in ('matched', 'cancelled')
        and receiver_match.status in ('matched', 'cancelled')
    )
  );
