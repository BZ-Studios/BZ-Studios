-- Profile UX rules: one free username change, then a three-month cooldown.
alter table public.profiles add column if not exists username_change_count integer not null default 0
  check (username_change_count >= 0);
alter table public.profiles add column if not exists username_changed_at timestamptz;

create or replace function public.change_username(candidate text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  current_profile public.profiles%rowtype;
  changed_at timestamptz := now();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if candidate !~ '^[A-Za-z0-9_]{3,24}$' then raise exception 'INVALID_USERNAME'; end if;

  select * into current_profile from public.profiles where user_id = uid for update;
  if current_profile.user_id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if current_profile.username = candidate::citext then
    return jsonb_build_object(
      'username', current_profile.username,
      'changeCount', current_profile.username_change_count,
      'nextChangeAt', case when current_profile.username_change_count > 0 then current_profile.username_changed_at + interval '3 months' else null end
    );
  end if;
  if not public.can_player_perform(public.current_player_id(), 'profile', null) then raise exception 'ACCOUNT_RESTRICTED'; end if;
  if current_profile.username_change_count >= 1
    and current_profile.username_changed_at > now() - interval '3 months' then
    raise exception 'USERNAME_COOLDOWN:%', current_profile.username_changed_at + interval '3 months';
  end if;
  if exists (select 1 from public.profiles where username = candidate::citext and user_id <> uid) then
    raise exception 'USERNAME_UNAVAILABLE';
  end if;

  update public.profiles set
    username = candidate::citext,
    username_change_count = current_profile.username_change_count + 1,
    username_changed_at = changed_at
  where user_id = uid;

  return jsonb_build_object(
    'username', candidate,
    'changeCount', current_profile.username_change_count + 1,
    'nextChangeAt', changed_at + interval '3 months'
  );
exception
  when unique_violation then raise exception 'USERNAME_UNAVAILABLE';
end;
$$;

revoke update (username) on table public.profiles from authenticated;
revoke all on function public.change_username(text) from public;
grant execute on function public.change_username(text) to authenticated;
