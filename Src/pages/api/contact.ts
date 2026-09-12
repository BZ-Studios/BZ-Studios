import type { APIRoute } from 'astro';
import { createPublicClient } from '../../lib/supabase';

export const prerender = false;

const redirect = (request: Request, path: string) => Response.redirect(new URL(path, request.url), 303);

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  if (String(form.get('bot-field') ?? '')) return redirect(request, '/contacto/?enviado=1');

  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const category = String(form.get('category') ?? '').trim();
  const message = String(form.get('message') ?? '').trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (name.length < 2 || name.length > 100 || !emailPattern.test(email) || email.length > 254 || !category || category.length > 80 || message.length < 10 || message.length > 5000) {
    return redirect(request, '/contacto/?error=1');
  }

  const supabase = createPublicClient();
  if (!supabase) return redirect(request, '/contacto/?error=1');

  const { error } = await supabase.from('contact_messages').insert({ name, email, category, message });
  return redirect(request, error ? '/contacto/?error=1' : '/contacto/?enviado=1');
};

export const ALL: APIRoute = async ({ request }) => redirect(request, '/contacto/');
