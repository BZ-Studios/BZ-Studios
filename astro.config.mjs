import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

const site = process.env.PUBLIC_SITE_URL || 'https://bz-studios.local';

export default defineConfig({
  site,
  srcDir: './Src',
  output: 'server',
  adapter: netlify(),
  integrations: [sitemap()],
  build: { format: 'directory' },
});
