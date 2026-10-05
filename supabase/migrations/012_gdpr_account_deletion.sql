-- Preserve a city group when the account that originally created it is deleted.
alter table public.location_group_chats
  alter column created_by drop not null;

alter table public.location_group_chats
  drop constraint if exists location_group_chats_created_by_fkey;

alter table public.location_group_chats
  add constraint location_group_chats_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;
