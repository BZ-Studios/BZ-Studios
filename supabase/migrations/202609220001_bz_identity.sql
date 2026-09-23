create extension if not exists pgcrypto;
create extension if not exists citext;

-- B&Z ID keeps authentication, player identity, game profiles and moderation separate.
alter table public.admins add column if not exists role text not null default 'owner';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admins_role_check') then
    alter table public.admins add constraint admins_role_check
      check (role in ('support','moderator','senior_moderator','administrator','owner'));
  end if;
end $$;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('BZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name citext not null unique check (display_name::text ~ '^[A-Za-z0-9_]{3,24}$'),
  status text not null default 'active' check (status in ('active','restricted','suspended','banned','pending_deletion','deleted')),
  last_active_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.players (auth_user_id, display_name, created_at, updated_at)
select p.user_id, p.username, p.created_at, p.updated_at
from public.profiles p
on conflict (auth_user_id) do update set
  display_name = excluded.display_name,
  updated_at = greatest(public.players.updated_at, excluded.updated_at);

create or replace function public.sync_player_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.players (auth_user_id, display_name, created_at, updated_at)
  values (new.user_id, new.username, new.created_at, new.updated_at)
  on conflict (auth_user_id) do update set
    display_name = excluded.display_name,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_sync_bz_identity on public.profiles;
create trigger profiles_sync_bz_identity
after insert or update of username on public.profiles
for each row execute function public.sync_player_from_profile();

drop trigger if exists players_set_updated_at on public.players;
create trigger players_set_updated_at before update on public.players
for each row execute function public.set_updated_at();

alter table public.game_ratings add column if not exists player_id uuid references public.players(id) on delete cascade;
alter table public.game_ratings add column if not exists review_status text not null default 'published';
alter table public.game_ratings add column if not exists reviewed_at timestamptz;
alter table public.game_ratings add column if not exists reviewed_by uuid references public.admins(user_id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'game_ratings_review_status_check') then
    alter table public.game_ratings add constraint game_ratings_review_status_check
      check (review_status in ('published','under_review','removed'));
  end if;
end $$;

update public.game_ratings r
set player_id = p.id
from public.players p
where r.player_id is null and p.auth_user_id = r.user_id;

do $$
begin
  if exists (select 1 from public.game_ratings where player_id is null) then
    raise exception 'B&Z ID migration stopped: one or more ratings do not have a matching player';
  end if;
  alter table public.game_ratings alter column player_id set not null;
end $$;

create unique index if not exists game_ratings_player_game_unique
  on public.game_ratings(player_id, game_id);

create or replace function public.sync_rating_player()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select id into new.player_id from public.players where auth_user_id = new.user_id;
  if new.player_id is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  return new;
end;
$$;

drop trigger if exists ratings_sync_bz_identity on public.game_ratings;
create trigger ratings_sync_bz_identity
before insert or update of user_id on public.game_ratings
for each row execute function public.sync_rating_player();

create table if not exists public.player_game_accounts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  external_player_id text not null check (char_length(external_player_id) between 3 and 128),
  platform text not null default 'unknown' check (char_length(platform) between 2 and 40),
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  link_status text not null default 'pending' check (link_status in ('pending','linked','restricted','unlinked','revoked')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  linked_at timestamptz,
  unlinked_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists player_game_accounts_active_external_unique
  on public.player_game_accounts(game_id, platform, external_player_id)
  where link_status in ('pending','linked','restricted');
create index if not exists player_game_accounts_player_idx on public.player_game_accounts(player_id);

drop trigger if exists player_game_accounts_set_updated_at on public.player_game_accounts;
create trigger player_game_accounts_set_updated_at before update on public.player_game_accounts
for each row execute function public.set_updated_at();

create table if not exists public.account_link_requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  external_player_id text not null check (char_length(external_player_id) between 3 and 128),
  platform text not null default 'unknown' check (char_length(platform) between 2 and 40),
  verification_code_hash text not null,
  status text not null default 'pending' check (status in ('pending','verified','consumed','expired','canceled','rejected')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint account_link_request_expiry check (expires_at > created_at)
);

create index if not exists account_link_requests_player_idx on public.account_link_requests(player_id, created_at desc);

create table if not exists public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete set null,
  game_account_id uuid references public.player_game_accounts(id) on delete set null,
  game_id uuid references public.games(id) on delete set null,
  status text not null default 'open' check (status in ('open','under_review','resolved','dismissed','appealed')),
  reason_code text not null check (char_length(reason_code) between 3 and 60),
  summary text not null check (char_length(summary) between 10 and 500),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 4000),
  opened_by uuid references public.admins(user_id) on delete set null,
  assigned_to uuid references public.admins(user_id) on delete set null,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.moderation_cases(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  scope_type text not null check (scope_type in ('feature','game_account','game','central_identity','ecosystem')),
  scope_id uuid,
  action_type text not null check (action_type in ('warning','rating_restriction','game_restriction','temporary_suspension','indefinite_ban','global_ban','restored')),
  reason_code text not null check (char_length(reason_code) between 3 and 60),
  user_message text not null check (char_length(user_message) between 10 and 1000),
  internal_note text check (internal_note is null or char_length(internal_note) <= 4000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.admins(user_id) on delete set null,
  revoked_by uuid references public.admins(user_id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint moderation_action_dates check (ends_at is null or ends_at > starts_at)
);

create index if not exists moderation_actions_active_player_idx
  on public.moderation_actions(player_id, starts_at, ends_at) where revoked_at is null;

create table if not exists public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.moderation_cases(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  message text not null check (char_length(message) between 20 and 2000),
  status text not null default 'submitted' check (status in ('submitted','under_review','accepted','partially_accepted','rejected')),
  reviewed_by uuid references public.admins(user_id) on delete set null,
  decision text check (decision is null or char_length(decision) between 10 and 2000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists moderation_appeals_one_open_per_case
  on public.moderation_appeals(case_id) where status in ('submitted','under_review');

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  request_reference uuid not null unique default gen_random_uuid(),
  player_id uuid references public.players(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  request_type text not null check (request_type in ('unlink_game','delete_game_account','delete_web_profile','delete_bz_id','administrative')),
  status text not null default 'requested' check (status in ('requested','verified','processing','completed','canceled','rejected')),
  requested_at timestamptz not null default now(),
  verified_at timestamptz,
  scheduled_for timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  retention_reason text check (retention_reason is null or char_length(retention_reason) <= 1000)
);

create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 3 and 80),
  target_type text check (target_type is null or char_length(target_type) <= 50),
  target_id uuid,
  outcome text not null default 'success' check (outcome in ('success','denied','failed')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists security_audit_events_player_idx on public.security_audit_events(player_id, created_at desc);

create or replace function public.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.players where auth_user_id = auth.uid();
$$;

create or replace function public.admin_role_rank(candidate text)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select case candidate
    when 'support' then 10
    when 'moderator' then 20
    when 'senior_moderator' then 30
    when 'administrator' then 40
    when 'owner' then 50
    else 0
  end;
$$;

create or replace function public.is_admin_at_least(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select public.admin_role_rank(role) >= public.admin_role_rank(required_role)
    from public.admins where user_id = auth.uid()
  ), false);
$$;

create or replace function public.can_player_perform(p_player_id uuid, p_action text, p_game_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  player_status text;
  owns_player boolean;
begin
  select status, auth_user_id = auth.uid() into player_status, owns_player
  from public.players where id = p_player_id;
  if player_status is null then return false; end if;
  if not coalesce(owns_player, false) and not public.is_admin() then return false; end if;
  -- A temporary suspension is governed by its action dates. Keeping it out of this
  -- unconditional check lets access recover automatically when ends_at expires.
  if player_status in ('banned','pending_deletion','deleted') then return false; end if;

  if exists (
    select 1 from public.moderation_actions a
    where a.player_id = p_player_id
      and a.revoked_at is null
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
      and a.action_type in ('temporary_suspension','indefinite_ban','global_ban')
  ) then return false; end if;

  if p_action = 'rate' and exists (
    select 1 from public.moderation_actions a
    where a.player_id = p_player_id
      and a.revoked_at is null
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
      and a.action_type = 'rating_restriction'
      and (a.scope_type in ('feature','central_identity','ecosystem') or (a.scope_type = 'game' and a.scope_id = p_game_id))
  ) then return false; end if;

  if p_game_id is not null and exists (
    select 1 from public.moderation_actions a
    where a.player_id = p_player_id
      and a.revoked_at is null
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
      and a.action_type = 'game_restriction'
      and (a.scope_type in ('central_identity','ecosystem') or (a.scope_type = 'game' and a.scope_id = p_game_id))
  ) then return false; end if;

  return true;
end;
$$;

create or replace function public.rating_result(target_game uuid, target_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'average', coalesce(round(avg(score) filter (where review_status = 'published')::numeric, 2), 0),
    'count', count(*) filter (where review_status = 'published'),
    'userScore', (select score from public.game_ratings where game_id = target_game and user_id = target_user and review_status <> 'removed')
  ) from public.game_ratings where game_id = target_game;
$$;

create or replace function public.set_game_rating(p_game_id uuid, p_score smallint)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  last_change timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_score not between 1 and 5 then raise exception 'INVALID_SCORE'; end if;
  select id into pid from public.players where auth_user_id = uid;
  if pid is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  if not public.can_player_perform(pid, 'rate', p_game_id) then raise exception 'ACCOUNT_RESTRICTED'; end if;
  if not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then raise exception 'EMAIL_NOT_VERIFIED'; end if;
  if not exists (select 1 from public.games where id = p_game_id and is_visible) then raise exception 'GAME_NOT_FOUND'; end if;
  select updated_at into last_change from public.game_ratings where user_id = uid and game_id = p_game_id;
  if last_change > now() - interval '2 seconds' then raise exception 'RATE_LIMITED'; end if;
  insert into public.game_ratings (user_id, player_id, game_id, score, review_status)
  values (uid, pid, p_game_id, p_score, 'published')
  on conflict (user_id, game_id) do update set
    score = excluded.score,
    player_id = excluded.player_id,
    review_status = 'published',
    reviewed_at = null,
    reviewed_by = null,
    updated_at = now();
  return public.rating_result(p_game_id, uid);
end;
$$;

create or replace view public.game_rating_stats with (security_barrier = true) as
select r.game_id, round(avg(r.score)::numeric, 2) as average_score, count(*)::bigint as rating_count
from public.game_ratings r join public.games g on g.id = r.game_id
where g.is_visible and r.review_status = 'published' group by r.game_id;

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
        'message', a.user_message,
        'startsAt', a.starts_at,
        'endsAt', a.ends_at
      ) order by a.created_at desc)
      from public.moderation_actions a
      where a.player_id = p.id and a.revoked_at is null
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

create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' and (select count(*) from public.admins where role = 'owner') <= 1 then
      raise exception 'LAST_OWNER_REQUIRED';
    end if;
    return old;
  end if;
  if old.role = 'owner' and new.role <> 'owner'
    and (select count(*) from public.admins where role = 'owner') <= 1 then
      raise exception 'LAST_OWNER_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists admins_protect_last_owner on public.admins;
create trigger admins_protect_last_owner
before delete or update of role on public.admins
for each row execute function public.protect_last_owner();

alter table public.players enable row level security;
alter table public.player_game_accounts enable row level security;
alter table public.account_link_requests enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.moderation_appeals enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.security_audit_events enable row level security;

drop policy if exists "Players read own identity" on public.players;
create policy "Players read own identity" on public.players for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());
drop policy if exists "Admins manage identities" on public.players;
create policy "Admins manage identities" on public.players for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Players read own game accounts" on public.player_game_accounts;
create policy "Players read own game accounts" on public.player_game_accounts for select to authenticated
  using (player_id = public.current_player_id() or public.is_admin());
drop policy if exists "Admins manage game accounts" on public.player_game_accounts;
create policy "Admins manage game accounts" on public.player_game_accounts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage link requests" on public.account_link_requests;
create policy "Admins manage link requests" on public.account_link_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage moderation cases" on public.moderation_cases;
create policy "Admins manage moderation cases" on public.moderation_cases for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins manage moderation actions" on public.moderation_actions;
create policy "Admins manage moderation actions" on public.moderation_actions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Players read own appeals" on public.moderation_appeals;
create policy "Players read own appeals" on public.moderation_appeals for select to authenticated
  using (player_id = public.current_player_id() or public.is_admin());
drop policy if exists "Players submit own appeals" on public.moderation_appeals;
create policy "Players submit own appeals" on public.moderation_appeals for insert to authenticated
  with check (
    player_id = public.current_player_id()
    and exists (select 1 from public.moderation_cases c where c.id = case_id and c.player_id = public.current_player_id())
  );
drop policy if exists "Admins manage appeals" on public.moderation_appeals;
create policy "Admins manage appeals" on public.moderation_appeals for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Players read own deletion requests" on public.account_deletion_requests;
create policy "Players read own deletion requests" on public.account_deletion_requests for select to authenticated
  using (player_id = public.current_player_id() or public.is_admin());
drop policy if exists "Admins manage deletion requests" on public.account_deletion_requests;
create policy "Admins manage deletion requests" on public.account_deletion_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read security audit" on public.security_audit_events;
create policy "Admins read security audit" on public.security_audit_events for select to authenticated
  using (public.is_admin());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated
  using (user_id = auth.uid() and public.can_player_perform(public.current_player_id(), 'profile', null))
  with check (user_id = auth.uid() and public.can_player_perform(public.current_player_id(), 'profile', null));

revoke all on public.players, public.player_game_accounts, public.account_link_requests,
  public.moderation_cases, public.moderation_actions, public.moderation_appeals,
  public.account_deletion_requests, public.security_audit_events from anon, authenticated;
grant select on public.players, public.player_game_accounts to authenticated;
grant select on public.moderation_appeals to authenticated;
grant insert (case_id, player_id, message) on public.moderation_appeals to authenticated;
grant select, insert, update, delete on public.players, public.player_game_accounts,
  public.account_link_requests, public.moderation_cases, public.moderation_actions,
  public.moderation_appeals, public.account_deletion_requests, public.security_audit_events to service_role;

revoke all on function public.current_player_id(), public.is_admin_at_least(text),
  public.can_player_perform(uuid, text, uuid), public.get_my_bz_id_data() from public;
grant execute on function public.current_player_id(), public.can_player_perform(uuid, text, uuid),
  public.get_my_bz_id_data() to authenticated;
grant execute on function public.is_admin_at_least(text) to authenticated;

-- Reapply the rating grants after the new review columns and functions are installed.
grant select on public.game_ratings, public.game_rating_stats to authenticated;
grant select on public.game_rating_stats to anon;
grant execute on function public.set_game_rating(uuid, smallint), public.delete_game_rating(uuid) to authenticated;
