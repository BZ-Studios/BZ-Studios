-- Separate play links from optional, per-device read-only previews.
begin;

alter table public.games
  add column if not exists preview_desktop_enabled boolean not null default false,
  add column if not exists preview_mobile_enabled boolean not null default false;

-- Preserve desktop previews for existing games in development.
update public.games set preview_desktop_enabled = true where status = 'En desarrollo';

-- Requested initial settings: both devices for Monkey Climb and UFO RUN;
-- desktop only for Aura Battle.
update public.games
set preview_desktop_enabled = true, preview_mobile_enabled = true
where slug in ('monkey-climb-remastered', 'ufo-run');

update public.games
set preview_desktop_enabled = true, preview_mobile_enabled = false
where slug = 'aura-battle';

comment on column public.games.preview_desktop_enabled is 'Show a read-only preview link on desktop game detail pages.';
comment on column public.games.preview_mobile_enabled is 'Show a read-only preview link on mobile game detail pages.';

commit;
