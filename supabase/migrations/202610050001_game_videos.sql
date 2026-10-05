alter table public.games
  add column if not exists video_urls text[] not null default '{}';

update public.games
set video_urls = case
  when 'https://youtube.com/shorts/V9pRAaBzYnI' = any(video_urls) then video_urls
  else array_append(video_urls, 'https://youtube.com/shorts/V9pRAaBzYnI')
end,
updated_at = now()
where slug = 'monkey-climb-remastered';

comment on column public.games.video_urls is
  'Videos adicionales de YouTube mostrados después del tráiler en la galería multimedia.';
