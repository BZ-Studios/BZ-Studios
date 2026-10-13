-- Make UFO RUN appear as a real linked game account after the first B&Z ID
-- session, and backfill players who already initialized their UFO RUN profile.

insert into public.player_game_accounts (
  player_id,
  game_id,
  external_player_id,
  platform,
  display_name,
  link_status,
  metadata,
  linked_at,
  last_verified_at
)
select
  p.id,
  g.id,
  p.id::text,
  'web',
  p.display_name,
  'linked',
  jsonb_build_object('integration', 'ufo-run', 'automatic', true),
  coalesce(up.created_at, now()),
  now()
from public.ufo_run_profiles up
join public.players p on p.id = up.player_id
join public.games g on g.slug = 'ufo-run'
where not exists (
  select 1
  from public.player_game_accounts a
  where a.player_id = p.id
    and a.game_id = g.id
    and a.link_status in ('pending', 'linked', 'restricted')
)
on conflict do nothing;

create or replace function public.ufo_run_initialize_player(p_auth_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  pid uuid;
  gid uuid;
begin
  select public.ufo_run_player_for_user(p_auth_user_id) into pid;
  select public.ufo_run_game_id() into gid;
  if pid is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  if gid is null then raise exception 'UFO_RUN_GAME_NOT_FOUND'; end if;
  if exists (
    select 1 from public.players p where p.id = pid and p.status in ('banned','pending_deletion','deleted')
  ) or exists (
    select 1 from public.moderation_actions a
    where a.player_id = pid
      and a.revoked_at is null
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
      and (
        a.action_type in ('temporary_suspension','indefinite_ban','global_ban')
        or (
          a.action_type = 'game_restriction'
          and (a.scope_type in ('central_identity','ecosystem') or (a.scope_type = 'game' and a.scope_id = gid))
        )
      )
  ) then raise exception 'ACCOUNT_RESTRICTED'; end if;

  insert into public.ufo_run_profiles (player_id, last_active_at)
  values (pid, now())
  on conflict (player_id) do update set last_active_at = now();

  insert into public.player_game_accounts (
    player_id,
    game_id,
    external_player_id,
    platform,
    display_name,
    link_status,
    metadata,
    linked_at,
    last_verified_at
  )
  select
    p.id,
    gid,
    p.id::text,
    'web',
    p.display_name,
    'linked',
    jsonb_build_object('integration', 'ufo-run', 'automatic', true),
    now(),
    now()
  from public.players p
  where p.id = pid
    and not exists (
      select 1
      from public.player_game_accounts a
      where a.player_id = p.id
        and a.game_id = gid
        and a.link_status in ('pending', 'linked', 'restricted')
    )
  on conflict do nothing;

  update public.players set last_active_at = now() where id = pid;
  insert into public.ufo_run_player_skins (player_id, skin_id, acquisition_source)
  values (pid, 'default', 'starter')
  on conflict do nothing;
  return pid;
end;
$$;

revoke all on function public.ufo_run_initialize_player(uuid) from public;
grant execute on function public.ufo_run_initialize_player(uuid) to service_role;
