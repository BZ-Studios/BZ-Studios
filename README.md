# B&Z Studios

Sitio oficial construido con Astro, TypeScript, CSS y Supabase. Incluye catálogo dinámico y panel privado de administración.
También incluye cuentas verificadas, perfil, recuperación de contraseña y calificaciones de 1 a 5 estrellas protegidas con RLS.
La primera versión de B&Z ID añade acceso por OTP y una integración segura, multi-juego y no destructiva para UFO RUN.

## Desarrollo local

```bash
npm install
npm run dev
```

Validación de producción: `npm run build`.

## Estructura

- `Src/pages/`: rutas del sitio.
- `Src/components/`: piezas visuales reutilizables.
- `Src/layouts/`: estructura HTML, metadata y SEO compartidos.
- `Src/data/games.ts`: catálogo de respaldo mientras Supabase no está inicializado.
- `Src/lib/`: conexión pública/SSR y consultas del catálogo.
- `Src/pages/admin/`: acceso privado, catálogo, perfiles del equipo y bandeja de mensajes.
- `Src/pages/cuenta/`: registro, acceso, recuperación, perfil y eliminación de cuenta.
- `supabase/`: migración SQL e instrucciones de configuración.
- `docs/ufo-run-integration.md`: contrato de autenticación, API, sincronización y migración desde Upstash.
- `Src/types/game.ts`: modelo de datos y estados válidos.
- `Src/config/site.ts`: navegación, integrantes y redes sociales.
- `Src/config/content.ts`: textos generales.
- `Src/styles/global.css`: sistema visual completo.
- `public/brand/`: copias web de la identidad; la página usa `logo-transparent.png`.
- `public/games/`: portadas y capturas, agrupadas por slug.

Los originales de marca permanecen intactos en `Src/Identidad/`. La copia transparente está guardada como `Src/Identidad/Logo sin fondo.png`.

## Gestionar juegos

1. Aplicá las migraciones y autorizá una cuenta administradora siguiendo `supabase/README.md`.
2. Iniciá el proyecto y abrí `http://localhost:4321/admin/`.
3. Desde el panel podés crear, editar, ocultar, destacar o eliminar juegos, y subir portada y capturas.

La ruta `/juegos/slug-del-juego/`, su metadata, filtros y datos estructurados se generan automáticamente desde Supabase. Desde el mismo dashboard también podés actualizar el nombre, rol e Instagram de cada integrante, consultar usuarios con sus calificaciones y administrar los mensajes recibidos.

La administración de identidad es multi-juego: **B&Z ID** concentra cuentas, sanciones y apelaciones, con búsqueda y filtro por juego. En **Juegos → Jugadores B&Z ID** se consultan las vinculaciones del juego elegido, en páginas de 20. El progreso específico se abre bajo demanda por jugador; UFO RUN ya tiene visor, sin una sección propia en el dashboard. No requiere SQL adicional. Ver `docs/bz-id-architecture.md` para los recorridos de prueba.

Las tarjetas muestran **Jugar** cuando el juego tiene URL, está Disponible, en Demo o En desarrollo y tiene marcada **Habilitar botón “Jugar”** en el editor del dashboard. Aplicá `202610220001_game_play_enabled.sql` para guardar este control: desactivado muestra **Próximamente** sin enlace, sin borrar la URL ni cambiar el estado del juego. Los juegos existentes se conservan habilitados. Sin URL válida o con estado **Próximamente**, el botón también queda deshabilitado.

**Ver vista previa** aparece únicamente en la ficha, de forma independiente del control de Jugar. El administrador puede habilitar la vista previa para PC, celular, ambos o ninguno. Aplicá `202610210001_game_preview_devices.sql`: configura Monkey Climb y UFO RUN para ambos dispositivos, y Aura Battle solo para PC. El botón abre `/juegos/slug-del-juego/vista-previa/`, un visor sin interacción por mouse, tacto ni teclado. El iframe solo se carga en los dispositivos habilitados. Si no hay URL, se muestran las imágenes y videos publicados. Los juegos con estado **Próximamente** no ofrecen vista previa.

El sitio del juego debe permitir cargarse en un iframe. El visor bloquea foco y eventos, usa sandbox y restringe permisos (incluidos gamepad y pantalla completa). Muestra el estado inicial que el juego cargue por sí solo: no puede avanzar automáticamente un menú ni controlar partes internas del juego. Es una restricción de interacción del portal, no una protección de la URL original: si el juego es público en otro dominio, seguirá accesible allí. Para restringir también ese acceso hay que configurar el servidor del juego.

## Contenido y configuración

- Redes sociales: `Src/config/site.ts`. Las URLs vacías no se muestran.
- Integrantes: `Src/config/site.ts`, propiedad `members`.
- Textos generales: `Src/config/content.ts`.
- URL canónica: variable `PUBLIC_SITE_URL` (ver `.env.example`).

## Supabase

Copiá `.env.example` como `.env` y completá las variables. El `.env` está ignorado por Git. Las políticas RLS protegen catálogo, perfiles y calificaciones; el frontend nunca recibe claves privadas. Ejecutá las migraciones en orden y seguí `supabase/README.md` para las URLs de correo y CAPTCHA.

## Contacto

El formulario valida los campos en el servidor y guarda los mensajes en Supabase con `SUPABASE_SECRET_KEY` (solo servidor). Aplicá `202610210002_contact_server_only.sql` para impedir inserciones directas desde la API pública y mantener obligatorias las validaciones del portal. Si `RESEND_API_KEY` está configurada, además envía una notificación a `CONTACT_TO_EMAIL` (por defecto `bzstudios.games@gmail.com`). Para producción, configurá `CONTACT_FROM_EMAIL` con una dirección de un dominio verificado en Resend.

## Despliegue

El proyecto usa el adaptador oficial de Vercel para renderizado bajo demanda. Importá el repositorio de GitHub en Vercel, configurá las variables indicadas en `supabase/README.md` y desplegá.

## Crear el repositorio en GitHub

1. Creá un repositorio vacío en GitHub, sin README ni `.gitignore`.
2. Ejecutá `git remote add origin URL_DEL_REPOSITORIO`.
3. Ejecutá `git branch -M main` y `git push -u origin main`.
4. Importá ese repositorio en Netlify y cargá las variables de entorno; `.env` nunca debe subirse.
