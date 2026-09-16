import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

const site = 'https://bzstudios.com.ar';
const excludedFromSitemap = ['/404/', '/admin/', '/admin/login/', '/admin/logout/', '/juegos/monkey-climb-remastered-v2/'];

export default defineConfig({
  site,
  srcDir: './Src',
  output: 'server',
  adapter: vercel(),
  integrations: [sitemap({
    filter: (page) => !excludedFromSitemap.includes(new URL(page).pathname),
  })],
  build: { format: 'directory' },
});
