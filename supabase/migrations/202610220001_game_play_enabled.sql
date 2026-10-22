-- Keep existing play links enabled; admins can disable them independently.
begin;

alter table public.games
  add column if not exists play_enabled boolean not null default true;

comment on column public.games.play_enabled is
  'Enable the public Play button. False shows a disabled Coming soon button without deleting play_url or changing preview settings.';

notify pgrst, 'reload schema';

commit;
