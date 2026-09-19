import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase';
import { safeNext } from '../../lib/account';
export const prerender = false;
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url), code = url.searchParams.get('code'), next = safeNext(url.searchParams.get('next'), '/cuenta/perfil/');
  const supabase = createSupabaseServerClient({ request, cookies });
  if (!code || !supabase) return redirect('/cuenta/login/?error=confirmacion', 303);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return redirect(error ? '/cuenta/login/?error=confirmacion' : next, 303);
};
