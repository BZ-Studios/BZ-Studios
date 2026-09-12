create table if not exists public.site_members (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  role text not null default 'Parte de B&Z Studios' check (char_length(role) between 2 and 120),
  instagram_url text check (instagram_url is null or instagram_url ~ '^https://(www\.)?instagram\.com/[A-Za-z0-9._]+/?$'),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_members_set_updated_at on public.site_members;
create trigger site_members_set_updated_at
before update on public.site_members
for each row execute function public.set_updated_at();

alter table public.site_members enable row level security;

drop policy if exists "Public reads visible members" on public.site_members;
create policy "Public reads visible members" on public.site_members
for select to anon, authenticated
using (is_visible or public.is_admin());

drop policy if exists "Admins insert members" on public.site_members;
create policy "Admins insert members" on public.site_members
for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins update members" on public.site_members;
create policy "Admins update members" on public.site_members
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete members" on public.site_members;
create policy "Admins delete members" on public.site_members
for delete to authenticated
using (public.is_admin());

grant select on public.site_members to anon, authenticated;
grant insert, update, delete on public.site_members to authenticated;

insert into public.site_members (id, name, role, sort_order, is_visible)
values
  ('luis-zabala', 'Luis Zabala', 'Parte de B&Z Studios', 1, true),
  ('agustin-bustamante', 'Agustín Bustamante', 'Parte de B&Z Studios', 2, true)
on conflict (id) do nothing;
