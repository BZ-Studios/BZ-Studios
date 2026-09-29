/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly SUPABASE_SECRET_KEY?: string;
  readonly UFO_RUN_SERVER_API_KEY?: string;
  readonly UFO_RUN_ALLOWED_ORIGINS?: string;
}
