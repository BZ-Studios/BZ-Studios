# B&Z Studios

Sitio oficial estático construido con Astro, TypeScript y CSS.

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
- `Src/data/games.ts`: catálogo central de juegos.
- `Src/types/game.ts`: modelo de datos y estados válidos.
- `Src/config/site.ts`: navegación, integrantes y redes sociales.
- `Src/config/content.ts`: textos generales.
- `Src/styles/global.css`: sistema visual completo.
- `public/brand/`: copias web optimizadas de la identidad original.
- `public/games/`: portadas y capturas, agrupadas por slug.

Los originales de marca permanecen intactos en `Src/Identidad/`.

## Agregar un juego

1. Creá `public/games/slug-del-juego/`.
2. Guardá allí la portada (`cover.webp`) y las capturas (`screenshot-01.webp`, etc.).
3. Abrí `Src/data/games.ts` y agregá un objeto al arreglo `games` que cumpla el tipo `Game`.
4. Usá rutas como `/games/slug-del-juego/cover.webp` en `cover` y `screenshots`.
5. Indicá uno o más valores en `genres`; los filtros se generan automáticamente.
6. Usá uno de estos estados: `Disponible`, `En desarrollo`, `Demo`, `Próximamente`.
7. Agregá la URL externa en `playUrl`. Omitila si todavía no se puede jugar.
8. Usá `featured: true` para mostrarlo en Inicio.

La ruta `/juegos/slug-del-juego/`, su metadata y sus datos estructurados se generan automáticamente.

## Contenido y configuración

- Redes sociales: `Src/config/site.ts`. Las URLs vacías no se muestran.
- Integrantes: `Src/config/site.ts`, propiedad `members`.
- Textos generales: `Src/config/content.ts`.
- URL canónica: variable `PUBLIC_SITE_URL` (ver `.env.example`).

## Contacto

El formulario está preparado para Netlify Forms con validación HTML, campo anti-spam y confirmación. En Vercel hay que conectarlo a un endpoint o función antes de recibir mensajes.

## Despliegue

En Netlify, conectá el repositorio: `netlify.toml` ejecuta el build y publica `dist/`. En Vercel, importá el repositorio: `vercel.json` contiene la misma configuración. En ambos casos configurá `PUBLIC_SITE_URL` con el dominio final.

## Pendientes deliberados

No hay login, calificaciones, comentarios, noticias, base de datos, panel administrador, tienda ni pagos. Tampoco se muestran redes sin URL ni se inventaron juegos de demostración.
