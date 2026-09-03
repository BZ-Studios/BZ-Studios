import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.PUBLIC_SITE_URL || 'https://bz-studios.local';

export default defineConfig({
  site,
  srcDir: './Src',
  output: 'static',
  integrations: [sitemap()],
  build: { format: 'directory' },
});
