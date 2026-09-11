import type { AstroCookies } from 'astro';
import { createSupabaseServerClient } from './supabase';

export async function getAdminSession(request: Request, cookies: AstroCookies) {
  const supabase = createSupabaseServerClient({ request, cookies });
  if (!supabase) return { supabase: null, user: null, isAdmin: false };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return { supabase, user, isAdmin: Boolean(data) };
}
