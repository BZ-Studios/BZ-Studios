# B&Z Studios

Sitio oficial construido con Astro, TypeScript, CSS y Supabase. Incluye catálogo dinámico y panel privado de administración.

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
- `Src/pages/admin/`: acceso privado y panel de juegos.
- `supabase/`: migración SQL e instrucciones de configuración.
- `Src/types/game.ts`: modelo de datos y estados válidos.
- `Src/config/site.ts`: navegación, integrantes y redes sociales.
- `Src/config/content.ts`: textos generales.
- `Src/styles/global.css`: sistema visual completo.
- `public/brand/`: copias web de la identidad; la página usa `logo-transparent.png`.
- `public/games/`: portadas y capturas, agrupadas por slug.

Los originales de marca permanecen intactos en `Src/Identidad/`. La copia transparente está guardada como `Src/Identidad/Logo sin fondo.png`.

## Gestionar juegos

1. Aplicá la migración y autorizá una cuenta siguiendo `supabase/README.md`.
2. Iniciá el proyecto y abrí `http://localhost:4321/admin/`.
3. Desde el panel podés crear, editar, ocultar, destacar o eliminar juegos, y subir portada y capturas.

La ruta `/juegos/slug-del-juego/`, su metadata, filtros y datos estructurados se generan automáticamente desde Supabase.

## Contenido y configuración

- Redes sociales: `Src/config/site.ts`. Las URLs vacías no se muestran.
- Integrantes: `Src/config/site.ts`, propiedad `members`.
- Textos generales: `Src/config/content.ts`.
- URL canónica: variable `PUBLIC_SITE_URL` (ver `.env.example`).

## Supabase

Copiá `.env.example` como `.env` y completá las variables públicas. El `.env` está ignorado por Git. Las políticas RLS restringen las escrituras a los usuarios listados en `public.admins`; el frontend nunca usa claves secretas.

## Contacto

El formulario está preparado para Netlify Forms con validación HTML, campo anti-spam y confirmación.

## Despliegue

El proyecto usa el adaptador oficial de Netlify para renderizado bajo demanda y mantiene Netlify Forms. Conectá el repositorio de GitHub, configurá las tres variables indicadas en `supabase/README.md` y desplegá. `netlify.toml` ejecuta el build y publica `dist/`.

## Crear el repositorio en GitHub

1. Creá un repositorio vacío en GitHub, sin README ni `.gitignore`.
2. Ejecutá `git remote add origin URL_DEL_REPOSITORIO`.
3. Ejecutá `git branch -M main` y `git push -u origin main`.
4. Importá ese repositorio en Netlify y cargá las variables de entorno; `.env` nunca debe subirse.
