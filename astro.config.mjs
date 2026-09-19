import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

const site = 'https://bzstudios.com.ar';
const excludedFromSitemap = ['/404/', '/juegos/monkey-climb-remastered-v2/'];
const isPrivateRoute = (pathname) => pathname.startsWith('/admin/') || pathname.startsWith('/cuenta/');

export default defineConfig({
  site,
  srcDir: './Src',
  output: 'server',
  adapter: vercel(),
  integrations: [sitemap({
    filter: (page) => {
      const pathname = new URL(page).pathname;
      return !excludedFromSitemap.includes(pathname) && !isPrivateRoute(pathname);
    },
  })],
  build: { format: 'directory' },
});
