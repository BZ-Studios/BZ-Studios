-- Ejecutar manualmente después de 202609290001_ufo_run_identity.sql.
-- Solo realiza comprobaciones de lectura; no modifica datos.
do $$
declare
  missing_game bigint;
  orphan_profiles bigint;
  invalid_ad_days bigint;
  duplicate_imports bigint;
  public_table_writes bigint;
begin
  select count(*) into missing_game from public.games where slug = 'ufo-run';
  select count(*) into orphan_profiles
  from public.ufo_run_profiles up left join public.players p on p.id = up.player_id
  where p.id is null;
  select count(*) into invalid_ad_days from public.ufo_run_daily_ad_rewards where ads_rewarded not between 0 and 10;
  select count(*) into duplicate_imports from (
    select player_id from public.ufo_run_progress_imports group by player_id having count(*) > 1
  ) duplicates;
  select count(*) into public_table_writes
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name like 'ufo_run_%'
    and grantee in ('anon','authenticated')
    and privilege_type in ('INSERT','UPDATE','DELETE')
    and table_name not in ('ufo_run_skins','ufo_run_achievements','ufo_run_legacy_scores');

  if missing_game <> 1 then raise exception 'UFO RUN no está registrado una sola vez en games'; end if;
  if orphan_profiles > 0 then raise exception 'Hay % perfiles UFO RUN huérfanos', orphan_profiles; end if;
  if invalid_ad_days > 0 then raise exception 'Hay % contadores diarios fuera de rango', invalid_ad_days; end if;
  if duplicate_imports > 0 then raise exception 'Hay % jugadores con más de una importación local', duplicate_imports; end if;
  if public_table_writes > 0 then raise exception 'Hay % permisos de escritura pública inesperados', public_table_writes; end if;
end $$;

select
  (select count(*) from public.ufo_run_profiles) as jugadores_ufo_run,
  (select count(*) from public.ufo_run_scores where score_source = 'verified') as records_verificados,
  (select count(*) from public.ufo_run_scores where score_source = 'local_import') as records_importados,
  (select count(*) from public.ufo_run_legacy_scores) as records_historicos,
  (select count(*) from public.ufo_run_progress_imports) as migraciones_locales;

select public.ufo_run_top_ranking('easy', 10) as top_easy;
select public.ufo_run_top_ranking('normal', 10) as top_normal;
select public.ufo_run_top_ranking('hard', 10) as top_hard;
