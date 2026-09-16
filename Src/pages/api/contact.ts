import type { APIRoute } from 'astro';
import { createPublicClient } from '../../lib/supabase';

export const prerender = false;

const redirect = (request: Request, path: string) => Response.redirect(new URL(path, request.url), 303);
const allowedCategories = new Set(['Idea', 'Sugerencia', 'Problema', 'Feedback sobre un juego', 'Consulta', 'Otro']);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);

async function notifyByEmail({ name, email, category, message }: { name: string; email: string; category: string; message: string }) {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY no está configurada. El mensaje quedó guardado en Supabase, sin notificación por email.');
    return;
  }

  const to = import.meta.env.CONTACT_TO_EMAIL || 'bzstudios.games@gmail.com';
  const from = import.meta.env.CONTACT_FROM_EMAIL || 'B&Z Studios <onboarding@resend.dev>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `[Web B&Z] ${category} — ${name}`,
      text: `Nuevo mensaje desde bzstudios.com.ar\n\nNombre: ${name}\nEmail: ${email}\nCategoría: ${category}\n\nMensaje:\n${message}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17121d"><h1 style="font-size:22px">Nuevo mensaje desde B&amp;Z Studios</h1><p><strong>Nombre:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a><br><strong>Categoría:</strong> ${escapeHtml(category)}</p><div style="padding:16px;border-left:4px solid #f329a8;background:#f8f4fa;white-space:pre-wrap">${escapeHtml(message)}</div></div>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend respondió ${response.status}: ${detail.slice(0, 300)}`);
  }
}

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  if (String(form.get('bot-field') ?? '')) return redirect(request, '/contacto/?enviado=1');

  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const category = String(form.get('category') ?? '').trim();
  const message = String(form.get('message') ?? '').trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (name.length < 2 || name.length > 100 || !emailPattern.test(email) || email.length > 254 || !allowedCategories.has(category) || message.length < 10 || message.length > 5000) {
    return redirect(request, '/contacto/?error=1');
  }

  const supabase = createPublicClient();
  if (!supabase) return redirect(request, '/contacto/?error=1');

  const { error } = await supabase.from('contact_messages').insert({ name, email, category, message });
  if (error) return redirect(request, '/contacto/?error=1');

  try {
    await notifyByEmail({ name, email, category, message });
  } catch (emailError) {
    console.error('El mensaje se guardó, pero falló la notificación por email.', emailError);
  }

  return redirect(request, '/contacto/?enviado=1');
};

export const ALL: APIRoute = async ({ request }) => redirect(request, '/contacto/');
