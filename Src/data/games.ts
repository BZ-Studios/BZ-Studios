import type { Game } from '../types/game';

/**
 * Catálogo central. Agregar un juego aquí crea su tarjeta y su página individual.
 * Los recursos de cada juego viven en /public/games/<slug>/.
 */
export const games: Game[] = [];

export const featuredGames = games.filter((game) => game.featured);

export const gameGenres = [...new Set(games.flatMap((game) => game.genres))]
  .sort((a, b) => a.localeCompare(b, 'es'));

export const getGameBySlug = (slug: string) => games.find((game) => game.slug === slug);
