create table if not exists public.profile_cnp_lookup (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  cnp_digest text not null unique,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profile_cnp_lookup enable row level security;
revoke all on public.profile_cnp_lookup from anon, authenticated;
grant all on public.profile_cnp_lookup to service_role;

create table if not exists public.profile_cnp_lookup_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists profile_cnp_lookup_attempts_user_time_idx
  on public.profile_cnp_lookup_attempts (user_id, created_at desc);

alter table public.profile_cnp_lookup_attempts enable row level security;
revoke all on public.profile_cnp_lookup_attempts from anon, authenticated;
grant all on public.profile_cnp_lookup_attempts to service_role;

create table if not exists public.location_group_chat_invitations (
  id uuid primary key default gen_random_uuid(),
  group_chat_id uuid not null references public.location_group_chats(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (group_chat_id, invitee_id),
  check (inviter_id <> invitee_id)
);

create index if not exists location_group_chat_invitations_incoming_idx
  on public.location_group_chat_invitations (invitee_id, status, created_at desc);

alter table public.location_group_chat_invitations enable row level security;

create policy "Users can view their group invitations"
  on public.location_group_chat_invitations for select to authenticated
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

create policy "Group members can invite people in the same city"
  on public.location_group_chat_invitations for insert to authenticated
  with check (
    inviter_id = auth.uid()
    and status = 'pending'
    and public.is_location_group_member(group_chat_id, auth.uid())
    and exists (
      select 1
      from public.location_group_chats gc
      join public.profiles invitee on invitee.id = location_group_chat_invitations.invitee_id
      join public.profiles inviter on inviter.id = location_group_chat_invitations.inviter_id
      where gc.id = group_chat_id
        and gc.city = invitee.city
        and gc.city = inviter.city
    )
    and not exists (
      select 1 from public.location_group_chat_members existing_member
      where existing_member.user_id = location_group_chat_invitations.invitee_id
    )
  );

create or replace function public.respond_to_location_group_chat_invitation(invitation_id uuid, accept_invitation boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  invite_row public.location_group_chat_invitations%rowtype;
  current_group_id uuid;
begin
  select * into invite_row
  from public.location_group_chat_invitations
  where id = invitation_id and invitee_id = current_user_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Invitația nu mai este disponibilă.';
  end if;

  if not accept_invitation then
    update public.location_group_chat_invitations set status = 'declined' where id = invitation_id;
    return null;
  end if;

  select group_chat_id into current_group_id
  from public.location_group_chat_members where user_id = current_user_id;
  if current_group_id is not null and current_group_id <> invite_row.group_chat_id then
    raise exception 'Poți face parte dintr-un singur grup.';
  end if;

  insert into public.location_group_chat_members (group_chat_id, user_id)
  values (invite_row.group_chat_id, current_user_id)
  on conflict (group_chat_id, user_id) do nothing;

  update public.location_group_chat_invitations set status = 'accepted' where id = invitation_id;
  return invite_row.group_chat_id;
end;
$$;

revoke all on function public.respond_to_location_group_chat_invitation(uuid, boolean) from public;
grant execute on function public.respond_to_location_group_chat_invitation(uuid, boolean) to authenticated;

