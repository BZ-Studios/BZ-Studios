import type { APIRoute } from 'astro';
import { getAccount } from '../../lib/account';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const { supabase, user } = await getAccount(request, cookies);
  if (!supabase || !user) return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), { status: 401, headers: { 'content-type': 'application/json' } });
  const [profile, ratings, identity] = await Promise.all([
    supabase.from('profiles').select('username, created_at, updated_at').eq('user_id', user.id).maybeSingle(),
    supabase.from('game_ratings').select('game_id, score, created_at, updated_at, games(name, slug)').order('updated_at', { ascending: false }),
    supabase.rpc('get_my_bz_id_data'),
  ]);
  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, emailConfirmedAt: user.email_confirmed_at, createdAt: user.created_at, lastSignInAt: user.last_sign_in_at },
    profile: profile.data,
    bzId: identity.error ? null : identity.data,
    ratings: ratings.data ?? [],
    notes: identity.error ? ['B&Z ID todavía no fue activado en la base de datos.'] : [],
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="bz-id-${user.id.slice(0, 8)}.json"`,
      'cache-control': 'private, no-store, max-age=0',
    },
  });
};
