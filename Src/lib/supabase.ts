import { createClient as createBaseClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export function createPublicClient() {
  if (!isSupabaseConfigured) return null;

  return createBaseClient(supabaseUrl as string, supabasePublishableKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseServerClient({ request, cookies }: { request: Request; cookies: AstroCookies }) {
  if (!isSupabaseConfigured) return null;

  return createServerClient(supabaseUrl as string, supabasePublishableKey as string, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, options));
      },
    },
  });
}
