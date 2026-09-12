# Configuración de Supabase

## 1. Crear las tablas y políticas

En el panel de Supabase abrí **SQL Editor**, creá una consulta nueva, pegá todo el contenido de `migrations/202609110001_init_catalog.sql` y ejecutala una sola vez. La migración crea el catálogo, las políticas RLS, el bucket público de imágenes y el juego inicial.

Ejecutá también `migrations/202609120001_contact_messages.sql`. Esta segunda migración permite que el formulario de contacto funcione en Vercel.

## 2. Crear la cuenta administradora

En **Authentication → Users**, elegí **Add user → Create new user**. Usá el correo de B&Z Studios, una contraseña segura y marcá el correo como confirmado.

Después, en **SQL Editor**, ejecutá reemplazando el correo:

```sql
insert into public.admins (user_id)
select id from auth.users
where email = 'correo-de-bz-studios@ejemplo.com'
on conflict (user_id) do nothing;
```

No habilites un formulario público de registro. El panel solo admite usuarios que también existan en `public.admins`.

## 3. Configurar autenticación

En **Authentication → URL Configuration**:

- Site URL: el dominio de producción asignado por Vercel.
- Redirect URL de producción: el mismo dominio terminado en `/**`.
- Redirect URL local opcional: `http://localhost:4321/**`.

## 4. Variables de entorno

El archivo `.env` local ya usa las credenciales públicas. En Vercel agregá:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PUBLIC_SITE_URL`

La publishable key puede usarse en el navegador porque RLS protege los datos. Nunca agregues una `service_role` o secret key al proyecto web.
