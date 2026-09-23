import type { AstroCookies } from 'astro';
import { createSupabaseServerClient } from './supabase';

export async function getAdminSession(request: Request, cookies: AstroCookies) {
  const supabase = createSupabaseServerClient({ request, cookies });
  if (!supabase) return { supabase: null, user: null, isAdmin: false, role: null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false, role: null };

  const roleResult = await supabase
    .from('admins')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleResult.error?.message.includes('role')) {
    const legacyResult = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    return { supabase, user, isAdmin: Boolean(legacyResult.data), role: legacyResult.data ? 'owner' : null };
  }

  return { supabase, user, isAdmin: Boolean(roleResult.data), role: roleResult.data?.role ?? null };
}
