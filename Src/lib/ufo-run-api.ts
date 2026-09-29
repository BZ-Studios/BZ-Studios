import { timingSafeEqual } from 'node:crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createAdminAuthClient } from './account';

const defaultOrigins = ['https://ufo-run-web.vercel.app'];

export function allowedUfoRunOrigins() {
  return (import.meta.env.UFO_RUN_ALLOWED_ORIGINS || defaultOrigins.join(','))
    .split(',')
    .map((origin: string) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}
export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin')?.replace(/\/$/, '') ?? '';
  const allowed = allowedUfoRunOrigins();
  const headers = new Headers({
    'Access-Control-Allow-Headers': 'authorization, content-type, idempotency-key, x-ufo-run-server-key',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'private, no-store',
    Vary: 'Origin',
  });
  if (origin && allowed.includes(origin)) headers.set('Access-Control-Allow-Origin', origin);
  return headers;
}

export function jsonResponse(request: Request, body: unknown, status = 200) {
  const headers = corsHeaders(request);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers });
}

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin')?.replace(/\/$/, '');
  return !origin || allowedUfoRunOrigins().includes(origin);
}

export function getAdminClient() {
  return createAdminAuthClient();
}

export async function requirePlayer(request: Request, admin: SupabaseClient): Promise<User> {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError(401, 'AUTH_REQUIRED', 'Falta la sesión de B&Z ID.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, 'INVALID_SESSION', 'La sesión venció o no es válida.');
  return data.user;
}

export function requireGameServer(request: Request) {
  const configured = import.meta.env.UFO_RUN_SERVER_API_KEY;
  const received = request.headers.get('x-ufo-run-server-key') ?? '';
  if (!configured) throw new ApiError(503, 'SERVER_KEY_NOT_CONFIGURED', 'La integración segura de UFO RUN todavía no está configurada.');
  const expectedBytes = Buffer.from(configured);
  const receivedBytes = Buffer.from(received);
  if (expectedBytes.length !== receivedBytes.length || !timingSafeEqual(expectedBytes, receivedBytes)) {
    throw new ApiError(403, 'GAME_SERVER_REQUIRED', 'La operación solo puede realizarla el servidor oficial de UFO RUN.');
  }
}

export async function readJson(request: Request) {
  const type = request.headers.get('content-type') ?? '';
  if (!type.toLowerCase().includes('application/json')) throw new ApiError(415, 'JSON_REQUIRED', 'El cuerpo debe enviarse como JSON.');
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'El JSON no es válido.');
  }
}

export function idempotencyKey(request: Request, body: Record<string, unknown>) {
  const value = request.headers.get('idempotency-key') ?? String(body.idempotencyKey ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(400, 'INVALID_IDEMPOTENCY_KEY', 'Enviá un UUID válido en Idempotency-Key.');
  }
  return value;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function rpcError(error: { message?: string } | null) {
  const message = error?.message ?? 'UNKNOWN_ERROR';
  const known = [
    'ACCOUNT_RESTRICTED', 'PLAYER_NOT_FOUND', 'INVALID_DIFFICULTY', 'INVALID_SCORE',
    'INVALID_REWARD', 'DAILY_AD_LIMIT', 'ACHIEVEMENT_NOT_FOUND', 'INVALID_PROGRESS',
    'LOCAL_IMPORT_ALREADY_USED', 'INVALID_SCORES', 'SKIN_NOT_OWNED', 'IDEMPOTENCY_CONFLICT',
  ].find((code) => message.includes(code));
  if (known === 'ACCOUNT_RESTRICTED') return new ApiError(403, known, 'La cuenta no puede utilizar UFO RUN mientras tenga una restricción activa.');
  if (known === 'DAILY_AD_LIMIT') return new ApiError(409, known, 'Ya alcanzaste el máximo de 10 recompensas por anuncios de hoy.');
  if (known === 'LOCAL_IMPORT_ALREADY_USED') return new ApiError(409, known, 'El progreso local de esta cuenta ya fue importado.');
  if (known === 'IDEMPOTENCY_CONFLICT') return new ApiError(409, known, 'La clave de idempotencia ya pertenece a otra operación.');
  if (known) return new ApiError(400, known, `La operación fue rechazada: ${known}.`);
  return new ApiError(500, 'DATABASE_ERROR', 'No pudimos completar la operación.');
}
