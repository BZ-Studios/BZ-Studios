import { readFile } from 'node:fs/promises';

const required = {
  'supabase/migrations/202609220001_bz_identity.sql': [
    'create table if not exists public.players',
    'create table if not exists public.player_game_accounts',
    'create table if not exists public.moderation_actions',
    'create table if not exists public.moderation_appeals',
    'create table if not exists public.security_audit_events',
    'create or replace function public.can_player_perform',
    'ACCOUNT_RESTRICTED',
    'enable row level security',
  ],
  'Src/pages/cuenta/perfil.astro': ['get_my_bz_id_data', 'moderation_appeals', 'Exportar mis datos', 'Vincular un juego · próximamente'],
  'Src/pages/admin/index.astro': ['moderate-player', 'delete-player', 'MODERATION_ACTION_LABELS'],
  'docs/bz-id-architecture.md': ['Idempotency-Key', 'servidor-a-servidor', 'Despliegue y reversión'],
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
if (failed) process.exit(1);
console.log('Contrato base de B&Z ID verificado.');
