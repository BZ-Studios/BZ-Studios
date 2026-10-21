-- All public contact submissions must pass the server's origin, body-size,
-- field, header and message validation before reaching the database.
begin;
drop policy if exists "Anyone submits contact messages" on public.contact_messages;
revoke insert on public.contact_messages from anon, authenticated;
grant insert on public.contact_messages to service_role;
-- Existing administrator SELECT / UPDATE / DELETE policies are preserved.
commit;
