import type { APIRoute } from 'astro';
import {
  ApiError,
  corsHeaders,
  getAdminClient,
  idempotencyKey,
  isAllowedOrigin,
  jsonResponse,
  readJson,
  requireGameServer,
  requirePlayer,
  rpcError,
} from '../../../../../lib/ufo-run-api';

export const prerender = false;

const handleError = (request: Request, error: unknown) => {
  const apiError = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
  return jsonResponse(request, { error: { code: apiError.code, message: apiError.message } }, apiError.status);
};
const operationFrom = (params: Record<string, string | undefined>) => params.operation ?? '';

export const OPTIONS: APIRoute = async ({ request }) => {
  if (!isAllowedOrigin(request)) return jsonResponse(request, { error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origen no autorizado.' } }, 403);
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};

export const GET: APIRoute = async ({ request, params, url }) => {
  try {
    if (!isAllowedOrigin(request)) throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Origen no autorizado.');
    const admin = getAdminClient();
    if (!admin) throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'El servidor no tiene configurado Supabase.');
    const operation = operationFrom(params);
    if (operation === 'ranking') {
      const difficulty = url.searchParams.get('difficulty') ?? 'normal';
      const { data, error } = await admin.rpc('ufo_run_top_ranking', { p_difficulty: difficulty, p_limit: 10 });
      if (error) throw rpcError(error);
      return jsonResponse(request, { difficulty, ranking: data });
    }
    if (operation === 'profile') {
      const user = await requirePlayer(request, admin);
      const { data, error } = await admin.rpc('ufo_run_get_progress', { p_auth_user_id: user.id });
      if (error) throw rpcError(error);
      return jsonResponse(request, data);
    }
    throw new ApiError(404, 'ENDPOINT_NOT_FOUND', 'El endpoint solicitado no existe.');
  } catch (error) {
    return handleError(request, error);
  }
};

export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    if (!isAllowedOrigin(request)) throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Origen no autorizado.');
    if (operationFrom(params) !== 'profile') throw new ApiError(404, 'ENDPOINT_NOT_FOUND', 'El endpoint solicitado no existe.');
    const admin = getAdminClient();
    if (!admin) throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'El servidor no tiene configurado Supabase.');
    const user = await requirePlayer(request, admin);
    const body = await readJson(request);
    const { data, error } = await admin.rpc('ufo_run_update_preferences', {
      p_auth_user_id: user.id,
      p_preferred_difficulty: String(body.preferredDifficulty ?? ''),
      p_sound_enabled: body.soundEnabled === true,
      p_equipped_skin: String(body.equippedSkin ?? 'default'),
    });
    if (error) throw rpcError(error);
    return jsonResponse(request, data);
  } catch (error) {
    return handleError(request, error);
  }
};

export const POST: APIRoute = async ({ request, params }) => {
  try {
    if (!isAllowedOrigin(request)) throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Origen no autorizado.');
    const admin = getAdminClient();
    if (!admin) throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'El servidor no tiene configurado Supabase.');
    const operation = operationFrom(params);
    const user = await requirePlayer(request, admin);
    const body = await readJson(request);
    let call: PromiseLike<{ data: unknown; error: { message: string } | null }>;

    if (operation === 'local-import') {
      call = admin.rpc('ufo_run_import_local_progress', {
        p_auth_user_id: user.id,
        p_request_id: idempotencyKey(request, body),
        p_coins: Number(body.coins ?? 0),
        p_scores: body.scores ?? {},
        p_skin_ids: Array.isArray(body.skinIds) ? body.skinIds.map(String) : [],
      });
    } else {
      requireGameServer(request);
      const key = idempotencyKey(request, body);
      if (operation === 'scores') {
        call = admin.rpc('ufo_run_submit_score', {
          p_auth_user_id: user.id,
          p_difficulty: String(body.difficulty ?? ''),
          p_score: Number(body.score ?? -1),
          p_idempotency_key: key,
        });
      } else if (operation === 'ad-rewards') {
        call = admin.rpc('ufo_run_record_ad_reward', {
          p_auth_user_id: user.id,
          p_idempotency_key: key,
          p_coin_reward: Number(body.coinReward ?? 0),
        });
      } else if (operation === 'achievements') {
        call = admin.rpc('ufo_run_update_achievement', {
          p_auth_user_id: user.id,
          p_achievement_code: String(body.achievementCode ?? ''),
          p_progress: Number(body.progress ?? -1),
          p_idempotency_key: key,
        });
      } else {
        throw new ApiError(404, 'ENDPOINT_NOT_FOUND', 'El endpoint solicitado no existe.');
      }
    }

    const { data, error } = await call;
    if (error) throw rpcError(error);
    return jsonResponse(request, data, 200);
  } catch (error) {
    return handleError(request, error);
  }
};
