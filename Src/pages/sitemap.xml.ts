import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';
import { getPublicGames } from '../lib/games';

const staticPaths = [
  '/',
  '/juegos/',
  '/sobre-nosotros/',
  '/ayuda/',
  '/contacto/',
  '/terminos/',
  '/privacidad/',
];

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export const GET: APIRoute = async () => {
  const games = await getPublicGames();
  const pages = [
    ...staticPaths.map((path) => ({ url: new URL(path, siteConfig.url).href, lastmod: undefined as string | undefined })),
    ...games.map((game) => ({
      url: new URL(`/juegos/${game.slug}/`, siteConfig.url).href,
      lastmod: game.publishedAt,
    })),
  ];

  const urls = pages.map(({ url, lastmod }) => {
    const modified = lastmod && !Number.isNaN(Date.parse(lastmod))
      ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>`
      : '';
    return `<url><loc>${escapeXml(url)}</loc>${modified}</url>`;
  }).join('');

  const body = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
