-- Ejecutar manualmente en SQL Editor después de la migración de B&Z ID.
-- Solo realiza comprobaciones de lectura; no modifica datos.
do $$
declare
  missing_players bigint;
  orphan_ratings bigint;
  duplicate_public_ids bigint;
begin
  select count(*) into missing_players
  from public.profiles p left join public.players i on i.auth_user_id = p.user_id
  where i.id is null;

  select count(*) into orphan_ratings
  from public.game_ratings where player_id is null;

  select count(*) into duplicate_public_ids
  from (select public_id from public.players group by public_id having count(*) > 1) duplicates;

  if missing_players > 0 then raise exception 'Hay % perfiles sin B&Z ID', missing_players; end if;
  if orphan_ratings > 0 then raise exception 'Hay % calificaciones sin player_id', orphan_ratings; end if;
  if duplicate_public_ids > 0 then raise exception 'Hay % public_id duplicados', duplicate_public_ids; end if;
end $$;

select
  (select count(*) from public.profiles) as perfiles,
  (select count(*) from public.players) as identidades_bz,
  (select count(*) from public.game_ratings) as calificaciones,
  (select count(*) from public.admins where role = 'owner') as propietarios;
