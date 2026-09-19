import type { APIRoute } from 'astro'; import { createSupabaseServerClient } from '../../lib/supabase';
export const prerender=false;
export const POST: APIRoute=async({request,cookies,redirect})=>{if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});await createSupabaseServerClient({request,cookies})?.auth.signOut();return redirect('/',303);};
