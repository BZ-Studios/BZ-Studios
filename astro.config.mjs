import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

const site = process.env.PUBLIC_SITE_URL || 'https://bz-studios.local';

export default defineConfig({
  site,
  srcDir: './Src',
  output: 'server',
  adapter: vercel(),
  integrations: [sitemap()],
  build: { format: 'directory' },
});
