create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  short_description text not null check (char_length(short_description) <= 240),
  description text not null,
  play_url text,
  trailer_url text,
  status text not null default 'En desarrollo' check (status in ('Disponible','En desarrollo','Demo','Próximamente')),
  platforms text[] not null default '{}',
  genres text[] not null default '{}',
  published_at date,
  featured boolean not null default false,
  is_visible boolean not null default false,
  seo_title text,
  seo_description text check (seo_description is null or char_length(seo_description) <= 160),
  features text[] not null default '{}',
  controls jsonb not null default '[]'::jsonb check (jsonb_typeof(controls) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_images (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  storage_path text not null unique,
  kind text not null check (kind in ('cover','banner','screenshot')),
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at before update on public.games for each row execute function public.set_updated_at();
drop trigger if exists game_images_set_updated_at on public.game_images;
create trigger game_images_set_updated_at before update on public.game_images for each row execute function public.set_updated_at();

alter table public.admins enable row level security;
alter table public.games enable row level security;
alter table public.game_images enable row level security;

drop policy if exists "Admins read themselves" on public.admins;
create policy "Admins read themselves" on public.admins for select to authenticated using (user_id = auth.uid());
drop policy if exists "Public reads visible games" on public.games;
create policy "Public reads visible games" on public.games for select to anon, authenticated using (is_visible or public.is_admin());
drop policy if exists "Admins insert games" on public.games;
create policy "Admins insert games" on public.games for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update games" on public.games;
create policy "Admins update games" on public.games for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete games" on public.games;
create policy "Admins delete games" on public.games for delete to authenticated using (public.is_admin());
drop policy if exists "Public reads images for visible games" on public.game_images;
create policy "Public reads images for visible games" on public.game_images for select to anon, authenticated using (public.is_admin() or exists (select 1 from public.games where games.id = game_images.game_id and games.is_visible));
drop policy if exists "Admins insert images" on public.game_images;
create policy "Admins insert images" on public.game_images for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update images" on public.game_images;
create policy "Admins update images" on public.game_images for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete images" on public.game_images;
create policy "Admins delete images" on public.game_images for delete to authenticated using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.games, public.game_images to anon, authenticated;
grant insert, update, delete on public.games, public.game_images to authenticated;
grant select on public.admins to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('game-media', 'game-media', true, 8388608, array['image/png','image/jpeg','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins read game media" on storage.objects;
create policy "Admins read game media" on storage.objects for select to authenticated using (bucket_id = 'game-media' and public.is_admin());
drop policy if exists "Admins upload game media" on storage.objects;
create policy "Admins upload game media" on storage.objects for insert to authenticated with check (bucket_id = 'game-media' and public.is_admin());
drop policy if exists "Admins update game media" on storage.objects;
create policy "Admins update game media" on storage.objects for update to authenticated using (bucket_id = 'game-media' and public.is_admin()) with check (bucket_id = 'game-media' and public.is_admin());
drop policy if exists "Admins delete game media" on storage.objects;
create policy "Admins delete game media" on storage.objects for delete to authenticated using (bucket_id = 'game-media' and public.is_admin());

insert into public.games (slug, name, short_description, description, play_url, status, platforms, genres, featured, is_visible, seo_title, seo_description)
values (
  'monkey-climb-remastered',
  'Monkey Climb Remastered',
  'Nuestro primer juego ya está listo para jugar directamente desde el navegador.',
  'El primer juego de B&Z Studios ya está disponible. Entrá a su sitio oficial y empezá la partida desde tu navegador.',
  'https://monkeyclimbremastered.com',
  'Disponible',
  array['Web'],
  array['Plataformas'],
  true,
  true,
  'Monkey Climb Remastered',
  'Jugá Monkey Climb Remastered, el primer videojuego disponible de B&Z Studios.'
)
on conflict (slug) do update set
  name = excluded.name,
  play_url = excluded.play_url,
  status = excluded.status,
  is_visible = excluded.is_visible,
  updated_at = now();
