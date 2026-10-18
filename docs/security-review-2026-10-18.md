# Revisión de seguridad del portal — 18 de octubre de 2026

Alcance: revisión del código del portal, rutas de contacto y cuenta, serialización HTML/JSON, enlaces públicos, carga de imágenes y dependencias. Las pruebas de escritura se ejecutaron contra un servicio local ficticio. No se ejecutaron migraciones ni se modificaron registros, permisos o credenciales de producción.

## Correcciones aplicadas

- El contenido dinámico de los scripts JSON-LD ahora escapa los caracteres que pueden cerrar un elemento `script`. La misma función serializa los datos del administrador. El contenido HTML de los emails continúa escapado.
- Se eliminó la construcción con `innerHTML` de la galería administrativa: las imágenes, los valores y los botones se crean mediante nodos DOM.
- Las URLs públicas de juegos, tráileres y perfiles se limitan a HTTP/HTTPS, sin credenciales incrustadas; los enlaces de YouTube se verifican por protocolo, dominio e identificador.
- El contacto usa límites compartidos entre cliente y servidor: nombre de 2–100 caracteres, email de hasta 254, mensaje de 10–5.000 y cuerpo de hasta 96 KiB, aun sin Content-Length. Rechaza campos duplicados, archivos en campos de texto, categorías desconocidas, caracteres de control en encabezados de correo y solicitudes de otro origen. El honeypot permanece activo.
- Las comprobaciones de origen de las acciones de cuenta y administración también rechazan solicitudes identificadas por el navegador como cross-site.
- Las imágenes administrativas se limitan a PNG, JPEG, WebP o AVIF de hasta 8 MiB. Las políticas del bucket siguen siendo responsabilidad de Supabase.
- Vercel añade `nosniff`, política de referencia, restricciones de objetos/base/framing/envío de formularios y permisos de cámara, micrófono, ubicación y pagos. Las páginas de cuenta y administración reciben `Cache-Control: private, no-store`. La política CSP no restringe `script-src`: no se presenta como protección integral frente a XSS.
- Se actualizaron dependencias compatibles. `path-to-regexp` usa una corrección de la rama 6 mediante `overrides`, sin degradar el adaptador de Vercel a una versión mayor antigua. La auditoría de dependencias de producción posterior no reportó vulnerabilidades conocidas.

## Comprobaciones

`npm run test:security` prueba cargas con cierre de script, codificación de HTML, entradas SQL como texto inerte, duplicados, archivos, saltos de línea en encabezados, límites de longitud, límites de bytes y validación de origen. Las consultas del portal usan el cliente de Supabase y argumentos estructurados, sin concatenar SQL suministrado por usuarios.

La prueba HTTP local confirmó que las peticiones rechazadas no llegan a la inserción de mensajes. También se comprobó que JSON-LD con un título malicioso sigue siendo JSON válido y no crea un script ejecutable.

## Límites de la revisión

No es una auditoría de infraestructura ni una prueba de penetración del sistema completo. Se revisaron las políticas RLS de las migraciones del repositorio, pero no se certificó que coincidan con las políticas actualmente aplicadas en producción.

La política actual de contacto permite inserciones anónimas directamente en Supabase: los límites del endpoint del portal no sustituyen las restricciones de base de datos y se pueden omitir usando esa API pública. Para control de spam sostenido hacen falta límites de frecuencia persistentes o de WAF y, si se quiere impedir el acceso directo, una revisión de esa política RLS y de la ruta de inserción en servidor. No se añadió un limitador en memoria que aparentara cubrir todas las instancias de Vercel.

La vista previa de un juego limita la interacción en el portal. No protege la URL pública original ni reemplaza la autorización del servidor del juego.

## Referencias

- [OWASP: prevención de XSS](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).
- [Aviso y versiones corregidas de path-to-regexp](https://github.com/advisories/GHSA-9wv6-86v2-598j).
