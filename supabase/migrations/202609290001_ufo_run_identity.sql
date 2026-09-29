-- UFO RUN module for B&Z ID.
-- This migration is additive: it does not remove Upstash, legacy scores, profiles or auth users.

insert into public.games (
  slug, name, short_description, description, play_url, status,
  platforms, genres, featured, is_visible, seo_title, seo_description
)
values (
  'ufo-run',
  'UFO RUN',
  'Un desafío arcade espacial de B&Z Studios.',
  'Esquivá obstáculos, mejorá tu nave y competí por la mejor puntuación en cada dificultad.',
  'https://ufo-run-web.vercel.app/',
  'Disponible',
  array['Web'],
  array['Arcade'],
  false,
  false,
  'UFO RUN | B&Z Studios',
  'Jugá UFO RUN y competí en el ranking de B&Z Studios.'
)
on conflict (slug) do nothing;

create table if not exists public.ufo_run_profiles (
  player_id uuid primary key references public.players(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0 and coins <= 100000000),
  equipped_skin text not null default 'default',
  preferred_difficulty text not null default 'normal' check (preferred_difficulty in ('easy','normal','hard')),
  sound_enabled boolean not null default true,
  local_progress_imported_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ufo_run_skins (
  id text primary key check (id ~ '^[a-z0-9_-]{2,50}$'),
  name text not null check (char_length(name) between 2 and 80),
  price integer not null default 0 check (price >= 0 and price <= 1000000),
  importable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.ufo_run_skins (id, name, price, importable)
values ('default', 'Nave inicial', 0, true)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ufo_run_profiles_equipped_skin_fkey') then
    alter table public.ufo_run_profiles add constraint ufo_run_profiles_equipped_skin_fkey
      foreign key (equipped_skin) references public.ufo_run_skins(id) on delete restrict;
  end if;
end $$;

create table if not exists public.ufo_run_player_skins (
  player_id uuid not null references public.players(id) on delete cascade,
  skin_id text not null references public.ufo_run_skins(id) on delete restrict,
  acquisition_source text not null default 'game' check (acquisition_source in ('starter','purchase','achievement','admin','local_import')),
  acquired_at timestamptz not null default now(),
  primary key (player_id, skin_id)
);

create table if not exists public.ufo_run_scores (
  player_id uuid not null references public.players(id) on delete cascade,
  difficulty text not null check (difficulty in ('easy','normal','hard')),
  best_score integer not null default 0 check (best_score >= 0 and best_score <= 100000000),
  best_verified_score integer check (best_verified_score is null or best_verified_score between 0 and 100000000),
  best_imported_score integer check (best_imported_score is null or best_imported_score between 0 and 100000000),
  score_source text not null default 'verified' check (score_source in ('verified','local_import')),
  achieved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, difficulty)
);

create index if not exists ufo_run_scores_ranking_idx
  on public.ufo_run_scores(difficulty, best_verified_score desc, achieved_at asc)
  where best_verified_score is not null;

create table if not exists public.ufo_run_score_submissions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  difficulty text not null check (difficulty in ('easy','normal','hard')),
  score integer not null check (score >= 0 and score <= 100000000),
  idempotency_key uuid not null unique,
  accepted boolean not null default true,
  submitted_at timestamptz not null default now()
);

create index if not exists ufo_run_score_submissions_player_idx
  on public.ufo_run_score_submissions(player_id, submitted_at desc);

create table if not exists public.ufo_run_achievements (
  code text primary key check (code ~ '^[a-z0-9_]{3,60}$'),
  name text not null check (char_length(name) between 2 and 100),
  description text not null check (char_length(description) between 5 and 500),
  reward_coins integer not null default 0 check (reward_coins >= 0 and reward_coins <= 100000),
  required_progress integer not null default 1 check (required_progress > 0 and required_progress <= 100000000),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ufo_run_player_achievements (
  player_id uuid not null references public.players(id) on delete cascade,
  achievement_code text not null references public.ufo_run_achievements(code) on delete restrict,
  progress integer not null default 0 check (progress >= 0 and progress <= 100000000),
  unlocked_at timestamptz,
  reward_granted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (player_id, achievement_code)
);

create table if not exists public.ufo_run_daily_ad_rewards (
  player_id uuid not null references public.players(id) on delete cascade,
  reward_date date not null default (now() at time zone 'UTC')::date,
  ads_rewarded smallint not null default 0 check (ads_rewarded between 0 and 10),
  coins_granted integer not null default 0 check (coins_granted >= 0 and coins_granted <= 1000000),
  updated_at timestamptz not null default now(),
  primary key (player_id, reward_date)
);

create table if not exists public.ufo_run_reward_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  event_type text not null check (event_type in ('ad','achievement','local_import','purchase_refund','admin')),
  reference_key text not null,
  coin_delta integer not null check (coin_delta between -1000000 and 1000000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (player_id, event_type, reference_key)
);

create table if not exists public.ufo_run_progress_imports (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null unique references public.players(id) on delete cascade,
  request_id uuid not null unique,
  imported_coins integer not null default 0 check (imported_coins between 0 and 2000),
  imported_scores jsonb not null default '{}'::jsonb check (jsonb_typeof(imported_scores) = 'object'),
  imported_skins text[] not null default '{}',
  status text not null default 'accepted_limited' check (status in ('accepted_limited','rejected','under_review')),
  imported_at timestamptz not null default now()
);

create table if not exists public.ufo_run_legacy_scores (
  id uuid primary key default gen_random_uuid(),
  legacy_name text not null check (char_length(legacy_name) between 1 and 80),
  difficulty text not null check (difficulty in ('easy','normal','hard')),
  score integer not null check (score >= 0 and score <= 100000000),
  source_key text not null unique,
  imported_at timestamptz not null default now(),
  verified_player_id uuid references public.players(id) on delete set null,
  verified_at timestamptz,
  check ((verified_player_id is null and verified_at is null) or (verified_player_id is not null and verified_at is not null))
);

create index if not exists ufo_run_legacy_scores_ranking_idx
  on public.ufo_run_legacy_scores(difficulty, score desc);

drop trigger if exists ufo_run_profiles_set_updated_at on public.ufo_run_profiles;
create trigger ufo_run_profiles_set_updated_at before update on public.ufo_run_profiles
for each row execute function public.set_updated_at();
drop trigger if exists ufo_run_scores_set_updated_at on public.ufo_run_scores;
create trigger ufo_run_scores_set_updated_at before update on public.ufo_run_scores
for each row execute function public.set_updated_at();
drop trigger if exists ufo_run_player_achievements_set_updated_at on public.ufo_run_player_achievements;
create trigger ufo_run_player_achievements_set_updated_at before update on public.ufo_run_player_achievements
for each row execute function public.set_updated_at();
drop trigger if exists ufo_run_daily_ad_rewards_set_updated_at on public.ufo_run_daily_ad_rewards;
create trigger ufo_run_daily_ad_rewards_set_updated_at before update on public.ufo_run_daily_ad_rewards
for each row execute function public.set_updated_at();

create or replace function public.ufo_run_game_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.games where slug = 'ufo-run' limit 1;
$$;

create or replace function public.ufo_run_player_for_user(p_auth_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.players where auth_user_id = p_auth_user_id;
$$;

create or replace function public.ufo_run_initialize_player(p_auth_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  pid uuid;
begin
  select public.ufo_run_player_for_user(p_auth_user_id) into pid;
  if pid is null then raise exception 'PLAYER_NOT_FOUND'; end if;
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
          and (a.scope_type in ('central_identity','ecosystem') or (a.scope_type = 'game' and a.scope_id = public.ufo_run_game_id()))
        )
      )
  ) then raise exception 'ACCOUNT_RESTRICTED'; end if;

  insert into public.ufo_run_profiles (player_id, last_active_at)
  values (pid, now())
  on conflict (player_id) do update set last_active_at = now();
  update public.players set last_active_at = now() where id = pid;
  insert into public.ufo_run_player_skins (player_id, skin_id, acquisition_source)
  values (pid, 'default', 'starter')
  on conflict do nothing;
  return pid;
end;
$$;

create or replace function public.ufo_run_get_progress(p_auth_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  pid uuid;
  result jsonb;
begin
  pid := public.ufo_run_initialize_player(p_auth_user_id);
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'publicId', p.public_id,
      'displayName', p.display_name,
      'coins', up.coins,
      'equippedSkin', up.equipped_skin,
      'preferredDifficulty', up.preferred_difficulty,
      'soundEnabled', up.sound_enabled,
      'localProgressImportedAt', up.local_progress_imported_at,
      'lastActiveAt', up.last_active_at
    ),
    'scores', coalesce((select jsonb_agg(jsonb_build_object(
      'difficulty', s.difficulty, 'bestScore', s.best_score,
      'bestVerifiedScore', s.best_verified_score, 'bestImportedScore', s.best_imported_score,
      'source', s.score_source, 'achievedAt', s.achieved_at
    ) order by s.difficulty) from public.ufo_run_scores s where s.player_id = pid), '[]'::jsonb),
    'skins', coalesce((select jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'acquiredAt', ps.acquired_at
    ) order by ps.acquired_at) from public.ufo_run_player_skins ps
      join public.ufo_run_skins s on s.id = ps.skin_id where ps.player_id = pid), '[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(jsonb_build_object(
      'code', a.code, 'name', a.name, 'description', a.description,
      'rewardCoins', a.reward_coins, 'requiredProgress', a.required_progress,
      'progress', coalesce(pa.progress, 0), 'unlockedAt', pa.unlocked_at
    ) order by a.code) from public.ufo_run_achievements a
      left join public.ufo_run_player_achievements pa on pa.achievement_code = a.code and pa.player_id = pid
      where a.is_active), '[]'::jsonb),
    'adsRewardedToday', coalesce((select ads_rewarded from public.ufo_run_daily_ad_rewards
      where player_id = pid and reward_date = (now() at time zone 'UTC')::date), 0)
  ) into result
  from public.players p join public.ufo_run_profiles up on up.player_id = p.id
  where p.id = pid;
  return result;
end;
$$;

create or replace function public.ufo_run_update_preferences(
  p_auth_user_id uuid,
  p_preferred_difficulty text,
  p_sound_enabled boolean,
  p_equipped_skin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare pid uuid;
begin
  if p_preferred_difficulty not in ('easy','normal','hard') then raise exception 'INVALID_DIFFICULTY'; end if;
  pid := public.ufo_run_initialize_player(p_auth_user_id);
  if not exists (select 1 from public.ufo_run_player_skins where player_id = pid and skin_id = p_equipped_skin) then
    raise exception 'SKIN_NOT_OWNED';
  end if;
  update public.ufo_run_profiles set
    preferred_difficulty = p_preferred_difficulty,
    sound_enabled = p_sound_enabled,
    equipped_skin = p_equipped_skin,
    last_active_at = now()
  where player_id = pid;
  return public.ufo_run_get_progress(p_auth_user_id);
end;
$$;

create or replace function public.ufo_run_submit_score(
  p_auth_user_id uuid,
  p_difficulty text,
  p_score integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare pid uuid; inserted_count integer;
begin
  if p_difficulty not in ('easy','normal','hard') then raise exception 'INVALID_DIFFICULTY'; end if;
  if p_score < 0 or p_score > 100000000 then raise exception 'INVALID_SCORE'; end if;
  pid := public.ufo_run_initialize_player(p_auth_user_id);
  insert into public.ufo_run_score_submissions (player_id, difficulty, score, idempotency_key)
  values (pid, p_difficulty, p_score, p_idempotency_key)
  on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    if not exists (select 1 from public.ufo_run_score_submissions where idempotency_key = p_idempotency_key and player_id = pid) then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
  else
    insert into public.ufo_run_scores (player_id, difficulty, best_score, best_verified_score, score_source, achieved_at)
    values (pid, p_difficulty, p_score, p_score, 'verified', now())
    on conflict (player_id, difficulty) do update set
      best_score = greatest(public.ufo_run_scores.best_score, excluded.best_score),
      best_verified_score = greatest(coalesce(public.ufo_run_scores.best_verified_score, 0), excluded.best_verified_score),
      score_source = case when excluded.best_score >= public.ufo_run_scores.best_score then 'verified' else public.ufo_run_scores.score_source end,
      achieved_at = case when excluded.best_score > public.ufo_run_scores.best_score then now() else public.ufo_run_scores.achieved_at end;
  end if;
  return jsonb_build_object('accepted', true, 'difficulty', p_difficulty,
    'bestScore', (select best_score from public.ufo_run_scores where player_id = pid and difficulty = p_difficulty));
end;
$$;

create or replace function public.ufo_run_record_ad_reward(
  p_auth_user_id uuid,
  p_idempotency_key uuid,
  p_coin_reward integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare pid uuid; today date := (now() at time zone 'UTC')::date; current_count integer; inserted_count integer;
begin
  if p_coin_reward < 1 or p_coin_reward > 100 then raise exception 'INVALID_REWARD'; end if;
  pid := public.ufo_run_initialize_player(p_auth_user_id);
  insert into public.ufo_run_reward_events (player_id, event_type, reference_key, coin_delta)
  values (pid, 'ad', p_idempotency_key::text, p_coin_reward)
  on conflict (player_id, event_type, reference_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    select ads_rewarded into current_count from public.ufo_run_daily_ad_rewards where player_id = pid and reward_date = today;
    return jsonb_build_object('rewarded', false, 'duplicate', true, 'adsRewardedToday', coalesce(current_count, 0));
  end if;
  insert into public.ufo_run_daily_ad_rewards (player_id, reward_date, ads_rewarded, coins_granted)
  values (pid, today, 1, p_coin_reward)
  on conflict (player_id, reward_date) do update set
    ads_rewarded = public.ufo_run_daily_ad_rewards.ads_rewarded + 1,
    coins_granted = public.ufo_run_daily_ad_rewards.coins_granted + excluded.coins_granted
  where public.ufo_run_daily_ad_rewards.ads_rewarded < 10
  returning ads_rewarded into current_count;
  if current_count is null then
    delete from public.ufo_run_reward_events where player_id = pid and event_type = 'ad' and reference_key = p_idempotency_key::text;
    raise exception 'DAILY_AD_LIMIT';
  end if;
  update public.ufo_run_profiles set coins = coins + p_coin_reward, last_active_at = now() where player_id = pid;
  return jsonb_build_object('rewarded', true, 'coins', p_coin_reward, 'adsRewardedToday', current_count);
end;
$$;

create or replace function public.ufo_run_update_achievement(
  p_auth_user_id uuid,
  p_achievement_code text,
  p_progress integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare pid uuid; achievement public.ufo_run_achievements%rowtype; state public.ufo_run_player_achievements%rowtype; granted boolean := false;
begin
  if p_progress < 0 or p_progress > 100000000 then raise exception 'INVALID_PROGRESS'; end if;
  pid := public.ufo_run_initialize_player(p_auth_user_id);
  select * into achievement from public.ufo_run_achievements where code = p_achievement_code and is_active for share;
  if achievement.code is null then raise exception 'ACHIEVEMENT_NOT_FOUND'; end if;
  insert into public.ufo_run_player_achievements (player_id, achievement_code, progress, unlocked_at)
  values (pid, achievement.code, least(p_progress, achievement.required_progress),
    case when p_progress >= achievement.required_progress then now() else null end)
  on conflict (player_id, achievement_code) do update set
    progress = greatest(public.ufo_run_player_achievements.progress, excluded.progress),
    unlocked_at = coalesce(public.ufo_run_player_achievements.unlocked_at, excluded.unlocked_at)
  returning * into state;
  if state.unlocked_at is not null and state.reward_granted_at is null then
    insert into public.ufo_run_reward_events (player_id, event_type, reference_key, coin_delta, metadata)
    values (pid, 'achievement', achievement.code, achievement.reward_coins,
      jsonb_build_object('idempotencyKey', p_idempotency_key))
    on conflict (player_id, event_type, reference_key) do nothing;
    if found then
      update public.ufo_run_profiles set coins = coins + achievement.reward_coins, last_active_at = now() where player_id = pid;
      update public.ufo_run_player_achievements set reward_granted_at = now()
        where player_id = pid and achievement_code = achievement.code;
      granted := true;
    end if;
  end if;
  return jsonb_build_object('code', achievement.code, 'progress', state.progress,
    'unlocked', state.unlocked_at is not null, 'rewardGranted', granted, 'rewardCoins', achievement.reward_coins);
end;
$$;

create or replace function public.ufo_run_import_local_progress(
  p_auth_user_id uuid,
  p_request_id uuid,
  p_coins integer,
  p_scores jsonb,
  p_skin_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare pid uuid; safe_coins integer; difficulty text; candidate integer; safe_scores jsonb := '{}'::jsonb;
begin
  pid := public.ufo_run_initialize_player(p_auth_user_id);
  if exists (select 1 from public.ufo_run_progress_imports where player_id = pid) then raise exception 'LOCAL_IMPORT_ALREADY_USED'; end if;
  if jsonb_typeof(coalesce(p_scores, '{}'::jsonb)) <> 'object' then raise exception 'INVALID_SCORES'; end if;
  safe_coins := least(greatest(coalesce(p_coins, 0), 0), 2000);
  foreach difficulty in array array['easy','normal','hard'] loop
    candidate := least(greatest(coalesce((p_scores ->> difficulty)::integer, 0), 0), 100000);
    safe_scores := safe_scores || jsonb_build_object(difficulty, candidate);
    insert into public.ufo_run_scores (player_id, difficulty, best_score, best_imported_score, score_source)
    values (pid, difficulty, candidate, candidate, 'local_import')
    on conflict (player_id, difficulty) do update set
      best_score = greatest(public.ufo_run_scores.best_score, excluded.best_score),
      best_imported_score = greatest(coalesce(public.ufo_run_scores.best_imported_score, 0), excluded.best_imported_score),
      score_source = case when excluded.best_score > public.ufo_run_scores.best_score then 'local_import' else public.ufo_run_scores.score_source end;
  end loop;
  insert into public.ufo_run_player_skins (player_id, skin_id, acquisition_source)
  select pid, s.id, 'local_import' from public.ufo_run_skins s
  where s.id = any(coalesce(p_skin_ids, '{}'::text[])) and s.importable and s.is_active
  on conflict do nothing;
  insert into public.ufo_run_progress_imports (player_id, request_id, imported_coins, imported_scores, imported_skins)
  values (pid, p_request_id, safe_coins, safe_scores,
    array(select s.id from public.ufo_run_skins s where s.id = any(coalesce(p_skin_ids, '{}'::text[])) and s.importable and s.is_active));
  insert into public.ufo_run_reward_events (player_id, event_type, reference_key, coin_delta)
  values (pid, 'local_import', p_request_id::text, safe_coins);
  update public.ufo_run_profiles set coins = coins + safe_coins, local_progress_imported_at = now(), last_active_at = now()
  where player_id = pid;
  return jsonb_build_object('imported', true, 'coinsAccepted', safe_coins,
    'scoresAccepted', safe_scores, 'policy', 'one_time_limited_unverified');
exception
  when unique_violation then raise exception 'LOCAL_IMPORT_ALREADY_USED';
  when invalid_text_representation then raise exception 'INVALID_SCORES';
  when numeric_value_out_of_range then raise exception 'INVALID_SCORES';
end;
$$;

create or replace function public.ufo_run_top_ranking(p_difficulty text, p_limit integer default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if p_difficulty not in ('easy','normal','hard') then raise exception 'INVALID_DIFFICULTY'; end if;
  if p_limit < 1 or p_limit > 10 then raise exception 'INVALID_LIMIT'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('rank', ranked.position, 'displayName', ranked.display_name,
    'score', ranked.score) order by ranked.position), '[]'::jsonb) into result
  from (
    select row_number() over (order by entries.score desc, entries.achieved_at asc, entries.display_name) as position,
      entries.display_name, entries.score
    from (
      select p.display_name::text as display_name, s.best_verified_score as score, s.achieved_at
      from public.ufo_run_scores s join public.players p on p.id = s.player_id
      where s.difficulty = p_difficulty and s.best_verified_score is not null
        and p.status not in ('banned','pending_deletion','deleted')
      union all
      select l.legacy_name, l.score, l.imported_at from public.ufo_run_legacy_scores l
      where l.difficulty = p_difficulty and l.verified_player_id is null
    ) entries
    order by entries.score desc, entries.achieved_at asc, entries.display_name
    limit p_limit
  ) ranked;
  return result;
end;
$$;

alter table public.ufo_run_profiles enable row level security;
alter table public.ufo_run_skins enable row level security;
alter table public.ufo_run_player_skins enable row level security;
alter table public.ufo_run_scores enable row level security;
alter table public.ufo_run_score_submissions enable row level security;
alter table public.ufo_run_achievements enable row level security;
alter table public.ufo_run_player_achievements enable row level security;
alter table public.ufo_run_daily_ad_rewards enable row level security;
alter table public.ufo_run_reward_events enable row level security;
alter table public.ufo_run_progress_imports enable row level security;
alter table public.ufo_run_legacy_scores enable row level security;

drop policy if exists "Players read own UFO RUN profile" on public.ufo_run_profiles;
create policy "Players read own UFO RUN profile" on public.ufo_run_profiles for select to authenticated
  using (player_id = public.current_player_id() or public.is_admin());
drop policy if exists "Players read own UFO RUN skins" on public.ufo_run_player_skins;
create policy "Players read own UFO RUN skins" on public.ufo_run_player_skins for select to authenticated
  using (player_id = public.current_player_id() or public.is_admin());
drop policy if exists "Players read own UFO RUN scores" on public.ufo_run_scores;
create policy "Players read own UFO RUN scores" on public.ufo_run_scores for select to authenticated
  using (player_id = public.current_player_id() or public.is_admin());
drop policy if exists "Players read own UFO RUN achievements" on public.ufo_run_player_achievements;
create policy "Players read own UFO RUN achievements" on public.ufo_run_player_achievements for select to authenticated
  using (player_id = public.current_player_id() or public.is_admin());
drop policy if exists "Players read own UFO RUN ad rewards" on public.ufo_run_daily_ad_rewards;
create policy "Players read own UFO RUN ad rewards" on public.ufo_run_daily_ad_rewards for select to authenticated
  using (player_id = public.current_player_id() or public.is_admin());
drop policy if exists "Players read own UFO RUN imports" on public.ufo_run_progress_imports;
create policy "Players read own UFO RUN imports" on public.ufo_run_progress_imports for select to authenticated
  using (player_id = public.current_player_id() or public.is_admin());

drop policy if exists "Admins read UFO RUN reward events" on public.ufo_run_reward_events;
create policy "Admins read UFO RUN reward events" on public.ufo_run_reward_events for select to authenticated
  using (public.is_admin());
drop policy if exists "Admins read UFO RUN score submissions" on public.ufo_run_score_submissions;
create policy "Admins read UFO RUN score submissions" on public.ufo_run_score_submissions for select to authenticated
  using (public.is_admin());
drop policy if exists "Admins manage UFO RUN catalog" on public.ufo_run_skins;
create policy "Admins manage UFO RUN catalog" on public.ufo_run_skins for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins manage UFO RUN achievements" on public.ufo_run_achievements;
create policy "Admins manage UFO RUN achievements" on public.ufo_run_achievements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins manage UFO RUN legacy ranking" on public.ufo_run_legacy_scores;
create policy "Admins manage UFO RUN legacy ranking" on public.ufo_run_legacy_scores for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.ufo_run_profiles, public.ufo_run_skins, public.ufo_run_player_skins,
  public.ufo_run_scores, public.ufo_run_score_submissions, public.ufo_run_achievements,
  public.ufo_run_player_achievements, public.ufo_run_daily_ad_rewards, public.ufo_run_reward_events,
  public.ufo_run_progress_imports, public.ufo_run_legacy_scores from anon, authenticated;
grant select on public.ufo_run_profiles, public.ufo_run_player_skins, public.ufo_run_scores,
  public.ufo_run_player_achievements, public.ufo_run_daily_ad_rewards, public.ufo_run_progress_imports to authenticated;
grant select, insert, update, delete on public.ufo_run_skins, public.ufo_run_achievements,
  public.ufo_run_legacy_scores to authenticated;
grant select, insert, update, delete on public.ufo_run_profiles, public.ufo_run_player_skins,
  public.ufo_run_scores, public.ufo_run_score_submissions, public.ufo_run_player_achievements,
  public.ufo_run_daily_ad_rewards, public.ufo_run_reward_events, public.ufo_run_progress_imports to service_role;

revoke all on function public.ufo_run_game_id(), public.ufo_run_player_for_user(uuid),
  public.ufo_run_initialize_player(uuid), public.ufo_run_get_progress(uuid),
  public.ufo_run_update_preferences(uuid, text, boolean, text),
  public.ufo_run_submit_score(uuid, text, integer, uuid),
  public.ufo_run_record_ad_reward(uuid, uuid, integer),
  public.ufo_run_update_achievement(uuid, text, integer, uuid),
  public.ufo_run_import_local_progress(uuid, uuid, integer, jsonb, text[]),
  public.ufo_run_top_ranking(text, integer) from public;
grant execute on function public.ufo_run_get_progress(uuid),
  public.ufo_run_update_preferences(uuid, text, boolean, text),
  public.ufo_run_submit_score(uuid, text, integer, uuid),
  public.ufo_run_record_ad_reward(uuid, uuid, integer),
  public.ufo_run_update_achievement(uuid, text, integer, uuid),
  public.ufo_run_import_local_progress(uuid, uuid, integer, jsonb, text[]) to service_role;
grant execute on function public.ufo_run_top_ranking(text, integer) to anon, authenticated, service_role;
