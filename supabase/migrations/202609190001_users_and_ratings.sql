create extension if not exists citext;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique check (username::text ~ '^[A-Za-z0-9_]{3,24}$'),
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare candidate text;
begin
  candidate := coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'jugador_' || left(new.id::text, 8));
  insert into public.profiles (user_id, username, terms_accepted_at)
  values (new.id, candidate, coalesce((new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz, now()));
  return new;
end;
$$;

drop trigger if exists auth_user_created_profile on auth.users;
create trigger auth_user_created_profile after insert on auth.users for each row execute function public.handle_new_user();

insert into public.profiles (user_id, username, terms_accepted_at)
select id, 'jugador_' || left(id::text, 8), coalesce(created_at, now()) from auth.users
on conflict (user_id) do nothing;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists ratings_set_updated_at on public.game_ratings;
create trigger ratings_set_updated_at before update on public.game_ratings for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.game_ratings enable row level security;
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users read own ratings" on public.game_ratings;
create policy "Users read own ratings" on public.game_ratings for select to authenticated using (user_id = auth.uid());

create or replace view public.game_rating_stats with (security_barrier = true) as
select r.game_id, round(avg(r.score)::numeric, 2) as average_score, count(*)::bigint as rating_count
from public.game_ratings r join public.games g on g.id = r.game_id
where g.is_visible group by r.game_id;

create or replace function public.username_available(candidate text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select candidate ~ '^[A-Za-z0-9_]{3,24}$' and not exists (select 1 from public.profiles where username = candidate::citext);
$$;

create or replace function public.rating_result(target_game uuid, target_user uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'average', coalesce(round(avg(score)::numeric, 2), 0),
    'count', count(*),
    'userScore', (select score from public.game_ratings where game_id = target_game and user_id = target_user)
  ) from public.game_ratings where game_id = target_game;
$$;

create or replace function public.set_game_rating(p_game_id uuid, p_score smallint) returns jsonb
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare uid uuid := auth.uid(); last_change timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_score not between 1 and 5 then raise exception 'INVALID_SCORE'; end if;
  if not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then raise exception 'EMAIL_NOT_VERIFIED'; end if;
  if not exists (select 1 from public.games where id = p_game_id and is_visible) then raise exception 'GAME_NOT_FOUND'; end if;
  select updated_at into last_change from public.game_ratings where user_id = uid and game_id = p_game_id;
  if last_change > now() - interval '2 seconds' then raise exception 'RATE_LIMITED'; end if;
  insert into public.game_ratings (user_id, game_id, score) values (uid, p_game_id, p_score)
  on conflict (user_id, game_id) do update set score = excluded.score, updated_at = now();
  return public.rating_result(p_game_id, uid);
end;
$$;

create or replace function public.delete_game_rating(p_game_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.game_ratings where user_id = uid and game_id = p_game_id;
  return public.rating_result(p_game_id, uid);
end;
$$;

revoke all on public.profiles, public.game_ratings from anon, authenticated;
grant select, update (username) on public.profiles to authenticated;
grant select on public.game_ratings to authenticated;
grant select on public.game_rating_stats to anon, authenticated;
revoke all on function public.username_available(text), public.rating_result(uuid, uuid), public.set_game_rating(uuid, smallint), public.delete_game_rating(uuid) from public;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.set_game_rating(uuid, smallint), public.delete_game_rating(uuid) to authenticated;
