# UFO RUN + B&Z ID: contrato de integración

## Alcance del MVP

UFO RUN reutiliza el proyecto actual de Supabase y la identidad central `players`. El jugador solicita un OTP de seis dígitos, verifica el correo y recibe una sesión persistente de Supabase. El juego nunca recibe `SUPABASE_SECRET_KEY` ni `UFO_RUN_SERVER_API_KEY`.

La primera versión separa tres niveles de confianza:

1. **Cliente del juego:** puede autenticar, leer su progreso, cambiar preferencias y solicitar una importación local limitada.
2. **Servidor oficial de UFO RUN en Vercel:** valida una partida o recompensa y llama a la API central con `X-UFO-RUN-Server-Key`.
3. **Servidor central B&Z:** valida sesión, origen, clave del juego, idempotencia, límites y ejecuta funciones privadas con la secret key de Supabase.

Upstash continúa funcionando durante esta fase. No se debe retirar hasta que el juego lea y escriba correctamente en Supabase durante un período de observación.

## Variables de entorno

### Proyecto principal B&Z en Vercel

```dotenv
PUBLIC_SUPABASE_URL=https://proyecto-ejemplo.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ejemplo
SUPABASE_SECRET_KEY=sb_secret_ejemplo
UFO_RUN_SERVER_API_KEY=una-cadena-aleatoria-larga-y-privada
UFO_RUN_ALLOWED_ORIGINS=https://ufo-run-web.vercel.app,http://localhost:3000
```

### Proyecto UFO RUN en Vercel

```dotenv
VITE_SUPABASE_URL=https://proyecto-ejemplo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ejemplo
BZ_ID_API_URL=https://bzstudios.com.ar/api/bz-id/v1/ufo-run
UFO_RUN_SERVER_API_KEY=la-misma-cadena-privada-del-servidor-central
```

Las variables `VITE_*` son públicas. `UFO_RUN_SERVER_API_KEY` solo puede utilizarse en una función serverless de UFO RUN; nunca debe referenciarse desde archivos entregados al navegador. La secret key de Supabase únicamente existe en el proyecto principal.

## Autenticación con OTP

El juego puede usar `@supabase/supabase-js` con la URL y la publishable key:

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

export async function requestBzIdCode(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        terms_accepted_at: new Date().toISOString(),
        signup_source: 'ufo_run'
      }
    }
  });
  if (error) throw error;
}

export async function verifyBzIdCode(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });
  if (error) throw error;
  return data.session;
}

export async function signOutBzId() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

Supabase persiste y renueva la sesión automáticamente en el navegador. Al iniciar el juego se puede usar `getSession()` para restaurarla y `onAuthStateChange()` para reaccionar a renovaciones o cierres:

```js
const { data: { session } } = await supabase.auth.getSession();
supabase.auth.onAuthStateChange((_event, nextSession) => {
  currentSession = nextSession;
});
```

También existe una interfaz lista para probar en `https://bzstudios.com.ar/cuenta/bz-id/`.

## Cliente de la API central

```js
const BZ_API = import.meta.env.BZ_ID_API_URL;

async function bzRequest(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('AUTH_REQUIRED');
  const response = await fetch(`${BZ_API}/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.code || 'BZ_ID_ERROR');
  return body;
}
```

## Endpoints públicos para el jugador

### Obtener el perfil y progreso

`GET /profile`

Autenticación: `Authorization: Bearer <access_token>`.

Respuesta resumida:

```json
{
  "profile": {
    "publicId": "BZ-ABC123",
    "displayName": "Jugador_01",
    "coins": 250,
    "equippedSkin": "default",
    "preferredDifficulty": "normal",
    "soundEnabled": true,
    "localProgressImportedAt": null,
    "lastActiveAt": "2026-09-29T20:00:00Z"
  },
  "scores": [],
  "skins": [],
  "achievements": [],
  "adsRewardedToday": 0
}
```

### Sincronizar preferencias

`PATCH /profile`

```json
{
  "preferredDifficulty": "hard",
  "soundEnabled": true,
  "equippedSkin": "default"
}
```

Solo permite equipar una skin adquirida. No acepta monedas, logros ni puntuaciones.

### Consultar ranking

`GET /ranking?difficulty=normal`

No requiere autenticación. Devuelve como máximo diez elementos y solo expone posición, nombre público y puntuación:

```json
{
  "difficulty": "normal",
  "ranking": [{ "rank": 1, "displayName": "Jugador_01", "score": 12500 }]
}
```

### Importar progreso local una vez

`POST /local-import`

Requiere sesión e `Idempotency-Key` con un UUID nuevo.

```json
{
  "coins": 1800,
  "scores": { "easy": 12000, "normal": 9000, "hard": 2500 },
  "skinIds": ["default"]
}
```

Política aplicada en el servidor:

- una importación por B&Z ID;
- máximo 2.000 monedas;
- máximo 100.000 puntos importados por dificultad;
- solo skins activas marcadas como importables;
- puntuaciones marcadas como `local_import`, fuera del ranking verificado;
- registro de fecha, juego, valores aceptados e identificador idempotente.

La interfaz debe preguntar: **“¿Querés vincular el progreso guardado en este dispositivo a tu cuenta B&Z?”** y explicar que los valores pueden limitarse por seguridad.

## Endpoints exclusivos del servidor de UFO RUN

Estos endpoints requieren simultáneamente el access token del jugador, `Idempotency-Key` y `X-UFO-RUN-Server-Key`. El navegador no debe llamarlos directamente.

### Publicar una puntuación validada

`POST /scores`

```json
{ "difficulty": "hard", "score": 24500 }
```

La función serverless de UFO RUN debe validar la partida antes de reenviar el resultado. La API conserva las entregas y actualiza únicamente el mejor récord.

### Registrar una recompensa por anuncio

`POST /ad-rewards`

```json
{ "coinReward": 25 }
```

El servidor impide duplicados y admite un máximo de 10 recompensas UTC por jugador y día.

### Actualizar o desbloquear un logro

`POST /achievements`

```json
{ "achievementCode": "survivor_100", "progress": 100 }
```

El catálogo define el progreso requerido y la recompensa. Las monedas se acreditan una sola vez aunque la petición se repita.

Ejemplo de función serverless intermediaria en UFO RUN:

```js
export default async function handler(request, response) {
  const result = await fetch(`${process.env.BZ_ID_API_URL}/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: request.headers.authorization,
      'Idempotency-Key': request.headers['idempotency-key'],
      'X-UFO-RUN-Server-Key': process.env.UFO_RUN_SERVER_API_KEY
    },
    body: JSON.stringify(request.body)
  });
  response.status(result.status).json(await result.json());
}
```

## Errores

Todos los errores usan este formato:

```json
{ "error": { "code": "DAILY_AD_LIMIT", "message": "Ya alcanzaste el máximo..." } }
```

Casos esperables: `AUTH_REQUIRED`, `INVALID_SESSION`, `ORIGIN_NOT_ALLOWED`, `ACCOUNT_RESTRICTED`, `INVALID_DIFFICULTY`, `INVALID_SCORE`, `SKIN_NOT_OWNED`, `LOCAL_IMPORT_ALREADY_USED`, `DAILY_AD_LIMIT`, `IDEMPOTENCY_CONFLICT` y `GAME_SERVER_REQUIRED`.

La aplicación debe renovar o pedir nuevamente el OTP frente a `INVALID_SESSION`; no debe reintentar automáticamente errores de validación. Para fallos de red puede reintentar usando la misma clave de idempotencia.

## Migración gradual desde Upstash

1. Aplicar la migración de Supabase sin cambiar el juego.
2. Activar OTP, lectura de perfil y sincronización de preferencias.
3. Mantener la escritura del ranking actual en Upstash y, desde el servidor, escribir en paralelo en Supabase.
4. Comparar durante varios días el top 10 de ambas fuentes.
5. Exportar Upstash a `ufo_run_legacy_scores` con `source_key` único. Las filas antiguas se muestran como históricas y no se asocian a un usuario.
6. No permitir que una cuenta reclame automáticamente un nombre antiguo. Una asociación futura requiere revisión verificable.
7. Cambiar la lectura principal al ranking de Supabase manteniendo Upstash como respaldo temporal.
8. Retirar Upstash solamente después de validar métricas, errores e idempotencia y conservar un respaldo exportado.

## Evolución futura a SSO B&Z

El MVP pide un OTP en cada juego y comparte el mismo proyecto de Supabase. Para un SSO real, B&Z deberá operar como proveedor OAuth 2.1/OIDC: Authorization Code con PKCE, clientes separados por juego y ambiente, redirect URIs exactas, consentimientos, rotación de claves, discovery document, JWKS, scopes mínimos y revocación central. No se debe simular SSO compartiendo cookies entre dominios ni copiar tokens mediante parámetros de URL.
