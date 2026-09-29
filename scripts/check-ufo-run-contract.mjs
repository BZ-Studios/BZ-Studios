import { readFile } from 'node:fs/promises';

const required = {
  'supabase/migrations/202609290001_ufo_run_identity.sql': [
    'create table if not exists public.ufo_run_profiles',
    'create table if not exists public.ufo_run_scores',
    'create table if not exists public.ufo_run_player_skins',
    'create table if not exists public.ufo_run_player_achievements',
    'create table if not exists public.ufo_run_daily_ad_rewards',
    'create table if not exists public.ufo_run_progress_imports',
    'create table if not exists public.ufo_run_legacy_scores',
    'create or replace function public.ufo_run_submit_score',
    'create or replace function public.ufo_run_top_ranking',
    'LOCAL_IMPORT_ALREADY_USED',
    'enable row level security',
  ],
  'Src/pages/cuenta/bz-id.astro': ['signInWithOtp', 'verifyOtp', "type: 'email'", 'Código de acceso'],
  'Src/pages/api/bz-id/v1/ufo-run/[operation].ts': [
    "operation === 'profile'", "operation === 'ranking'", "operation === 'scores'",
    "operation === 'ad-rewards'", "operation === 'achievements'", "operation === 'local-import'",
  ],
  'Src/pages/admin/index.astro': ['id="ufo-run"', 'ufo_run_profiles', 'adsRewardedToday'],
  'docs/ufo-run-integration.md': ['Idempotency-Key', 'X-UFO-RUN-Server-Key', 'local-import', 'Upstash', 'OAuth 2.1/OIDC'],
  'supabase/tests/ufo_run_smoke.sql': ['public.ufo_run_top_ranking', 'public_table_writes'],
};

let failed = false;
for (const [file, markers] of Object.entries(required)) {
  const content = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  for (const marker of markers) {
    if (!content.includes(marker)) {
      failed = true;
      console.error(`Falta "${marker}" en ${file}`);
    }
  }
}

const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
if (/PUBLIC_UFO_RUN_SERVER_API_KEY|VITE_UFO_RUN_SERVER_API_KEY/.test(envExample)) {
  failed = true;
  console.error('La clave privada de UFO RUN no puede tener un prefijo público.');
}

if (failed) process.exit(1);
console.log('Contrato de UFO RUN y B&Z ID verificado.');
