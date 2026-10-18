import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async ({ url }, next) => {
  const response = await next();
  if (!/^\/(?:admin|cuenta)(?:\/|$)/.test(url.pathname)) return response;

  // SSR response headers take precedence over static Vercel header rules.
  // Set these on the actual response so account/admin content is never stored.
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Vercel-CDN-Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
