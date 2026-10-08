-- Profile and moderation corrections requested after production testing.
-- Username changes use an exact 90-day interval, appeals go through a
-- verified RPC, and the self-service payload only exposes active measures.

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
      'nextChangeAt', case when current_profile.username_change_count > 0 then current_profile.username_changed_at + interval '90 days' else null end
    );
  end if;
  if not public.can_player_perform(public.current_player_id(), 'profile', null) then raise exception 'ACCOUNT_RESTRICTED'; end if;
  if current_profile.username_change_count >= 1
    and current_profile.username_changed_at > now() - interval '90 days' then
    raise exception 'USERNAME_COOLDOWN:%', current_profile.username_changed_at + interval '90 days';
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
    'nextChangeAt', changed_at + interval '90 days'
  );
exception
  when unique_violation then raise exception 'USERNAME_UNAVAILABLE';
end;
$$;

create or replace function public.submit_moderation_appeal(p_case_id uuid, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  appeal_id uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(trim(p_message)) not between 20 and 2000 then raise exception 'INVALID_APPEAL_MESSAGE'; end if;

  select id into pid from public.players where auth_user_id = uid;
  if pid is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  if not exists (
    select 1 from public.moderation_cases c
    join public.moderation_actions a on a.case_id = c.id
    where c.id = p_case_id
      and c.player_id = pid
      and a.player_id = pid
      and a.revoked_at is null
      and a.action_type <> 'restored'
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
  ) then raise exception 'CASE_NOT_APPEALABLE'; end if;

  insert into public.moderation_appeals (case_id, player_id, message)
  values (p_case_id, pid, trim(p_message))
  returning id into appeal_id;

  return jsonb_build_object('id', appeal_id, 'status', 'submitted');
exception
  when unique_violation then raise exception 'APPEAL_ALREADY_OPEN';
end;
$$;

create or replace function public.get_my_bz_id_data()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'identity', jsonb_build_object(
      'id', p.id,
      'publicId', p.public_id,
      'displayName', p.display_name,
      'status', case
        when p.status in ('banned','pending_deletion','deleted') then p.status
        when exists (
          select 1 from public.moderation_actions a where a.player_id = p.id
            and a.revoked_at is null and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
            and a.action_type = 'temporary_suspension'
        ) then 'suspended'
        when p.status = 'restricted' or exists (
          select 1 from public.moderation_actions a where a.player_id = p.id
            and a.revoked_at is null and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
            and a.action_type in ('rating_restriction','game_restriction')
        ) then 'restricted'
        else 'active'
      end,
      'createdAt', p.created_at,
      'lastActiveAt', p.last_active_at
    ),
    'gameAccounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'gameId', a.game_id,
        'gameName', g.name,
        'platform', a.platform,
        'displayName', a.display_name,
        'status', a.link_status,
        'linkedAt', a.linked_at,
        'lastVerifiedAt', a.last_verified_at
      ) order by a.created_at desc)
      from public.player_game_accounts a join public.games g on g.id = a.game_id
      where a.player_id = p.id and a.link_status <> 'unlinked'
    ), '[]'::jsonb),
    'moderation', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'caseId', a.case_id,
        'action', a.action_type,
        'scope', a.scope_type,
        'scopeId', a.scope_id,
        'scopeName', case when a.scope_type = 'game' then (select g.name from public.games g where g.id = a.scope_id) else null end,
        'message', a.user_message,
        'startsAt', a.starts_at,
        'endsAt', a.ends_at
      ) order by a.created_at desc)
      from public.moderation_actions a
      where a.player_id = p.id
        and a.revoked_at is null
        and a.action_type <> 'restored'
        and a.starts_at <= now()
        and (a.ends_at is null or a.ends_at > now())
    ), '[]'::jsonb),
    'appeals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'caseId', a.case_id,
        'status', a.status,
        'message', a.message,
        'decision', a.decision,
        'createdAt', a.created_at,
        'reviewedAt', a.reviewed_at
      ) order by a.created_at desc)
      from public.moderation_appeals a where a.player_id = p.id
    ), '[]'::jsonb)
  )
  from public.players p where p.auth_user_id = auth.uid();
$$;

revoke all on function public.submit_moderation_appeal(uuid, text) from public;
grant execute on function public.submit_moderation_appeal(uuid, text) to authenticated;
revoke all on function public.change_username(text) from public;
grant execute on function public.change_username(text) to authenticated;
revoke all on function public.get_my_bz_id_data() from public;
grant execute on function public.get_my_bz_id_data() to authenticated;
