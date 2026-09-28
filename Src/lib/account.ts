import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import { createSupabaseServerClient } from './supabase';
import { siteConfig } from '../config/site';

export { usernamePattern, validPassword } from './credentials';
export const accountRedirectUrl = (path: string) => new URL(path, import.meta.env.PUBLIC_SITE_URL || siteConfig.url).href;
export const safeNext = (value: string | null, fallback = '/cuenta/perfil/') => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /%5c/i.test(value)) return fallback;
  const target = new URL(value, 'https://local.invalid');
  return target.origin === 'https://local.invalid' ? `${target.pathname}${target.search}${target.hash}` : fallback;
};
export const sameOrigin = (request: Request) => !request.headers.get('origin') || request.headers.get('origin') === new URL(request.url).origin;

export async function getAccount(request: Request, cookies: AstroCookies) {
  const supabase = createSupabaseServerClient({ request, cookies });
  if (!supabase) return { supabase: null, user: null };
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export function createAdminAuthClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const secret = import.meta.env.SUPABASE_SECRET_KEY;
  return url && secret ? createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}
