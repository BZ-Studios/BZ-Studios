# B&Z ID: arquitectura e integración

## Alcance de esta entrega

B&Z ID es la identidad central de los jugadores de B&Z Studios. Esta entrega incorpora el modelo de datos, la migración de las cuentas existentes, el perfil del jugador, exportación de datos, moderación por alcance, apelaciones, eliminación y auditoría. Las cuentas y calificaciones actuales siguen funcionando durante la transición.

La vinculación real con un videojuego queda deliberadamente desactivada hasta que ese juego tenga un servidor confiable. No se deben crear vinculaciones desde un cliente público ni incluir `SUPABASE_SECRET_KEY`, una clave de servicio o un secreto compartido dentro de un ejecutable del juego.

## Separación de responsabilidades

- `auth.users`: autenticación, correo, contraseña, sesiones y bloqueo de acceso.
- `profiles`: compatibilidad temporal con el nombre de usuario del sitio.
- `players`: identidad B&Z ID central, identificador público y estado global.
- `player_game_accounts`: relación entre una identidad y una cuenta concreta de un juego.
- `account_link_requests`: desafío temporal para demostrar control de una cuenta de juego.
- `game_ratings`: calificaciones; conserva `user_id` durante la transición y agrega `player_id`.
- `moderation_cases`: expediente y contexto de una investigación.
- `moderation_actions`: medida, alcance, duración, motivo y responsable.
- `moderation_appeals`: solicitud del jugador y resolución del equipo.
- `account_deletion_requests`: trazabilidad de solicitudes de desvinculación o eliminación.
- `security_audit_events`: registro restringido de acciones sensibles.

Una suspensión o bloqueo se asocia a `players`, no a una vinculación. Desvincular un juego no evade una medida vigente.

## Roles administrativos

| Rol | Capacidad principal |
| --- | --- |
| `support` | Consulta y asistencia sin sancionar |
| `moderator` | Advertencias, restricciones de calificación/juego y suspensiones temporales |
| `senior_moderator` | Lo anterior, bloqueos indefinidos y restauración |
| `administrator` | Bloqueos globales y supervisión del ecosistema |
| `owner` | Lo anterior y eliminación administrativa irreversible |

La migración protege al último `owner`: no se puede eliminar ni degradar si dejaría el sistema sin propietario.

## Estados y alcance de moderación

Los estados de identidad son `active`, `restricted`, `suspended`, `banned`, `pending_deletion` y `deleted`. Una acción puede alcanzar:

- una función, como calificar;
- una cuenta de juego vinculada;
- un juego completo;
- la identidad central;
- todo el ecosistema.

Cada medida exige código de motivo, mensaje visible, nota interna opcional, responsable, inicio y vencimiento cuando corresponde. El perfil expone al jugador la parte comprensible de la medida y permite una apelación abierta por caso.

## Contrato futuro para servidores de juegos

Estos contratos describen la integración futura; todavía no son rutas públicas activas.

### 1. Crear solicitud de vinculación

`POST /api/bz-id/v1/link-requests`

Autenticación: sesión B&Z ID del jugador. Cuerpo:

```json
{
  "gameId": "uuid",
  "externalPlayerId": "identificador-estable-del-juego",
  "platform": "windows"
}
```

Respuesta: `requestId`, código de un solo uso mostrado al jugador y `expiresAt`. La base guarda únicamente el hash del código. El vencimiento recomendado es de 10 minutos y el máximo de intentos es 5.

### 2. Confirmar desde el servidor del juego

`POST /api/bz-id/v1/link-requests/{requestId}/verify`

Autenticación: credencial servidor-a-servidor propia de ese juego, rotatoria y almacenada únicamente en infraestructura segura. Requiere `Idempotency-Key`, firma del cuerpo, marca temporal y protección contra repetición.

```json
{
  "code": "código-entregado-al-jugador",
  "externalPlayerId": "identificador-estable-del-juego",
  "platform": "windows"
}
```

El servidor central valida juego, plataforma, cuenta externa, hash, expiración, intentos, reutilización e identidad sancionada. La misma clave idempotente devuelve el mismo resultado; otra solicitud no puede consumir un desafío ya utilizado.

### 3. Consultar autorización

`POST /api/bz-id/v1/authorization/check`

Solo servidor-a-servidor. Recibe B&Z ID o vínculo, acción solicitada y juego. Devuelve `allowed`, estado, restricciones aplicables, vencimiento y un `decisionId` auditable. No devuelve correo, contraseña ni información de otros juegos.

### 4. Desvincular

`POST /api/bz-id/v1/game-accounts/{linkId}/unlink`

Requiere sesión reciente del jugador y reautenticación para acciones sensibles. Marca el vínculo como `unlinked`; no borra sanciones ni el expediente de seguridad. El servidor del juego recibe un evento firmado para revocar sesiones asociadas.

## Reglas mínimas de seguridad para activar una integración

1. Servidor de juego identificable y mantenido por B&Z Studios.
2. Credenciales distintas por juego y ambiente, con rotación y revocación documentadas.
3. TLS obligatorio, firma, timestamp, nonce y límite de frecuencia.
4. Códigos aleatorios de un solo uso, almacenados como hash y con vencimiento breve.
5. Idempotencia en confirmaciones y eventos.
6. Registro de éxitos, rechazos y anomalías sin guardar secretos.
7. Validación de alcance: un servidor solo consulta o modifica su propio juego.
8. Pruebas contra repetición, fuerza bruta, vínculo duplicado y evasión de sanciones.

## Despliegue y reversión

1. Crear respaldo lógico de las tablas de cuentas y calificaciones.
2. Ejecutar `supabase/migrations/202609220001_bz_identity.sql` en SQL Editor.
3. Confirmar que la cantidad de `players` coincide con `profiles` y que no hay calificaciones sin `player_id`.
4. Probar con una cuenta común y una administradora antes de moderar usuarios reales.
5. Desplegar la aplicación. El código detecta si la migración todavía no existe y mantiene el flujo anterior.

La reversión de interfaz consiste en volver al despliegue anterior. No se recomienda borrar inmediatamente las nuevas tablas: primero se revocan funciones nuevas y se conserva la información para diagnóstico. Las columnas antiguas `profiles.user_id` y `game_ratings.user_id` no se eliminan en esta fase, por lo que el sistema anterior permanece recuperable.

## Verificación operativa

- Una cuenta existente recibe exactamente un `players` y un `public_id` único.
- Cambiar `profiles.username` sincroniza `players.display_name`.
- Una restricción de calificación produce `ACCOUNT_RESTRICTED` y no afecta funciones fuera de su alcance.
- Una suspensión temporal bloquea el acceso hasta su vencimiento.
- Restaurar revoca acciones activas y quita el bloqueo de Supabase Auth.
- Una apelación solo puede pertenecer al jugador del caso y solo puede haber una abierta por caso.
- La exportación requiere sesión y usa `Cache-Control: private, no-store`.
- El cliente público nunca recibe `SUPABASE_SECRET_KEY`.
