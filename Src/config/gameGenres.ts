export const GAME_GENRES = [
  'Acción',
  'Aventura',
  'Arcade',
  'Plataformas',
  'Puzzle',
  'Estrategia',
  'RPG',
  'Roguelike/Roguelite',
  'Shooter',
  'Carreras',
  'Deportes',
  'Simulación',
  'Lucha',
  'Terror',
  'Supervivencia',
  'Casual',
  'Ritmo/Música',
  'Party',
  'Sandbox',
  'Tower Defense',
  'Cartas/Deckbuilding',
  'Metroidvania',
] as const;

export type GameGenre = (typeof GAME_GENRES)[number];

const LEGACY_GAME_GENRES: Record<string, GameGenre> = {
  Web: 'Plataformas',
  Platformer: 'Plataformas',
};

export function normalizeGameGenre(genre: string | null | undefined): string {
  const value = genre?.trim() ?? '';
  return LEGACY_GAME_GENRES[value] ?? value;
}

export function normalizeGameGenres(genres: readonly string[] | null | undefined): string[] {
  return [...new Set((genres ?? []).map(normalizeGameGenre).filter(Boolean))];
}
