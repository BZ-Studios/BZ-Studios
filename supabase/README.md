# Configuración de Supabase

## 1. Crear las tablas y políticas

En el panel de Supabase abrí **SQL Editor**, creá una consulta nueva, pegá todo el contenido de `migrations/202609110001_init_catalog.sql` y ejecutala una sola vez. La migración crea el catálogo, las políticas RLS, el bucket público de imágenes y el juego inicial.

Para habilitar cuentas y calificaciones, ejecutá después `migrations/202609190001_users_and_ratings.sql`. Crea `profiles`, `game_ratings`, la vista agregada, funciones protegidas y sus políticas RLS.

Para activar la identidad central, moderación, apelaciones y auditoría, ejecutá por último `migrations/202609220001_bz_identity.sql`. Es una migración idempotente: crea un B&Z ID para cada perfil existente y conserva las columnas anteriores durante la transición. Antes de ejecutarla en producción conviene exportar un respaldo de `profiles`, `game_ratings` y `admins`.

Después ejecutá `migrations/202609230001_profile_ux.sql`. Esta migración habilita el primer cambio gratuito de nombre de usuario, aplica una espera de tres meses a partir del segundo cambio e impide saltarse la regla mediante una actualización directa.

En **Authentication > URL Configuration** agregá `https://bzstudios.com.ar/**` a las URLs de redirección. Conservá activada la confirmación de correo. Supabase aplica límites de frecuencia y el formulario agrega un campo trampa contra bots; si más adelante se habilita CAPTCHA en Supabase, primero deberá integrarse su widget y enviar el token desde ambos formularios.

En Vercel agregá `SUPABASE_SECRET_KEY` como variable privada para consultar usuarios y calificaciones en el dashboard y permitir la eliminación definitiva de cuentas. No uses esa clave con prefijo `PUBLIC_` ni la expongas en el navegador.

Ejecutá también, en este orden:

1. `migrations/202609120001_contact_messages.sql`, para recibir y administrar los mensajes del formulario.
2. `migrations/202609120002_site_members.sql`, para editar los perfiles e Instagram del equipo desde el dashboard.

## 2. Crear la cuenta administradora

En **Authentication → Users**, elegí **Add user → Create new user**. Usá el correo de B&Z Studios, una contraseña segura y marcá el correo como confirmado.

Después, en **SQL Editor**, ejecutá reemplazando el correo:

```sql
insert into public.admins (user_id)
select id from auth.users
where email = 'correo-de-bz-studios@ejemplo.com'
on conflict (user_id) do nothing;
```

El registro público crea cuentas de jugadores, pero no concede acceso al panel. El panel solo admite usuarios que también existan en `public.admins`.

## 3. Configurar autenticación

En **Authentication → URL Configuration**:

- Site URL: el dominio de producción asignado por Vercel.
- Redirect URL de producción: el mismo dominio terminado en `/**`.
- Redirect URL local opcional: `http://localhost:4321/**`.

### Verificación por código

El registro lleva al usuario a `/cuenta/verificar/`, donde ingresa el código recibido por correo. Para que Supabase envíe el código en vez de un enlace:

1. Abrí **Authentication → Email Templates → Confirm sign up**.
2. Conservá habilitada la confirmación de correo.
3. Reemplazá el cuerpo del mensaje por una plantilla que incluya `{{ .Token }}`. Por ejemplo:

```html
<h2>Verificá tu cuenta B&amp;Z</h2>
<p>Tu código de verificación es:</p>
<p style="font-size: 30px; font-weight: 800; letter-spacing: 8px;">{{ .Token }}</p>
<p>Ingresalo en https://bzstudios.com.ar/cuenta/verificar/</p>
```

4. Guardá la plantilla y creá una cuenta de prueba. El código es de un solo uso y la página permite solicitar uno nuevo si venció.

### Recuperación de contraseña por código

La recuperación lleva al usuario de `/cuenta/recuperar/` a `/cuenta/restablecer/`, donde debe ingresar un código de 6 dígitos, la contraseña nueva y su confirmación. Para habilitar este flujo:

1. Abrí **Authentication → Sign In / Providers → Email** y confirmá que **Email OTP Length** sea `6`.
2. Abrí **Authentication → Email Templates → Reset password**.
3. Reemplazá el enlace por una plantilla que muestre `{{ .Token }}`:

```html
<h2>Restablecé tu contraseña de B&amp;Z Studios</h2>
<p>Tu código temporal de recuperación es:</p>
<p style="font-size: 30px; font-weight: 800; letter-spacing: 8px;">{{ .Token }}</p>
<p>Ingresalo en https://bzstudios.com.ar/cuenta/restablecer/</p>
<p>Si no solicitaste este cambio, podés ignorar el mensaje.</p>
```

4. Guardá la plantilla. El código es de un solo uso y vence según el tiempo configurado para los OTP de correo.

## 4. Variables de entorno

El archivo `.env` local ya usa las credenciales públicas. En Vercel agregá:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PUBLIC_SITE_URL`
- `SUPABASE_SECRET_KEY` como variable privada del servidor, necesaria para la sección de usuarios del dashboard y para eliminar cuentas desde el perfil

Para recibir también cada mensaje por correo mediante Resend agregá:

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL` con `bzstudios.games@gmail.com`
- `CONTACT_FROM_EMAIL` con una dirección de un dominio verificado

La publishable key puede usarse en el navegador porque RLS protege los datos. La secret key solo debe existir como variable privada de Vercel: nunca uses el prefijo `PUBLIC_` ni la importes desde componentes o scripts del navegador.

## 5. Comprobación manual en producción

1. Registrá una cuenta de prueba, comprobá que llegue el código e ingresalo en `/cuenta/verificar/`.
2. Iniciá sesión, calificá un juego y verificá que el promedio cambie una sola vez aunque modifiques la puntuación.
3. Abrí **Mi perfil**, realizá el primer cambio de nombre, confirmá que informe el plazo de tres meses, eliminá la calificación y probá el cambio de contraseña.
4. Solicitá la recuperación desde `/cuenta/recuperar/`, ingresá el código de 6 dígitos recibido y establecé una contraseña nueva.
5. Por último, eliminá la cuenta de prueba y confirmá en **Authentication → Users** que desapareció.

## 6. Verificación de B&Z ID

1. Ejecutá `npm run test:bz-id` y `npm run build` antes del despliegue.
2. Ingresá a `/cuenta/perfil/` con una cuenta existente y comprobá que aparezca un identificador con prefijo `BZ-`.
3. En el dashboard verificá que tu usuario administrador muestre el rol `Propietario`.
4. Creá una cuenta de prueba y aplicale una advertencia. La advertencia debe verse en el perfil, pero no impedir el inicio de sesión.
5. Aplicá una restricción de calificaciones y confirmá que el sitio rechace una nueva puntuación con un mensaje específico.
6. Enviá una apelación desde el perfil. Solo puede existir una apelación abierta por caso.
7. Probá la exportación JSON y confirmá que no contiene contraseñas, claves privadas ni información de otros usuarios.
8. Ejecutá `tests/bz_identity_smoke.sql` en SQL Editor para comprobar que no quedaron perfiles o calificaciones huérfanos y que existe al menos un propietario.

La vinculación real con videojuegos aún no se habilita desde el sitio. Antes de activarla, cada juego necesita un servidor confiable y debe cumplir el contrato y las reglas de seguridad descritos en `docs/bz-id-architecture.md`. Nunca coloques `SUPABASE_SECRET_KEY` dentro de un juego, aplicación móvil o código que llegue al navegador.
