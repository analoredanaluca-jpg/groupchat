alter table public.profiles
  add column if not exists account_type text not null default 'member'
  check (account_type in ('member', 'staff'));

drop policy if exists "Users can view matches involving them" on public.matches;
create policy "Users can view own matches and staff can view all matches"
  on public.matches for select
  to authenticated
  using (
    auth.uid() = user_id
    or auth.uid() = matched_user_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.account_type = 'staff'
    )
  );
