-- Chat is available only after both users have matched with each other.
-- Enforce this in the database so clients cannot bypass the chat page check.

drop policy if exists "Users can view their own messages" on public.messages;
drop policy if exists "Users can send messages as themselves" on public.messages;
drop policy if exists "Receivers can mark messages as read" on public.messages;

create policy "Matched users can view their messages"
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
        and sender_match.status = 'matched'
        and receiver_match.status = 'matched'
    )
  );

create policy "Matched users can send messages to each other"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
    and exists (
      select 1
      from public.matches sender_match
      join public.matches receiver_match
        on receiver_match.user_id = sender_match.matched_user_id
       and receiver_match.matched_user_id = sender_match.user_id
      where sender_match.user_id = sender_id
        and sender_match.matched_user_id = receiver_id
        and sender_match.status = 'matched'
        and receiver_match.status = 'matched'
    )
  );

create policy "Matched receivers can mark messages as read"
  on public.messages for update
  to authenticated
  using (
    auth.uid() = receiver_id
    and exists (
      select 1
      from public.matches sender_match
      join public.matches receiver_match
        on receiver_match.user_id = sender_match.matched_user_id
       and receiver_match.matched_user_id = sender_match.user_id
      where sender_match.user_id = messages.sender_id
        and sender_match.matched_user_id = messages.receiver_id
        and sender_match.status = 'matched'
        and receiver_match.status = 'matched'
    )
  )
  with check (
    auth.uid() = receiver_id
    and exists (
      select 1
      from public.matches sender_match
      join public.matches receiver_match
        on receiver_match.user_id = sender_match.matched_user_id
       and receiver_match.matched_user_id = sender_match.user_id
      where sender_match.user_id = messages.sender_id
        and sender_match.matched_user_id = messages.receiver_id
        and sender_match.status = 'matched'
        and receiver_match.status = 'matched'
    )
  );
