import type { Game } from '../types/game';

/**
 * Catálogo central. Agregar un juego aquí crea su tarjeta y su página individual.
 * Los recursos de cada juego viven en /public/games/<slug>/.
 */
export const games: Game[] = [
  {
    id: 'monkey-climb-remastered',
    slug: 'monkey-climb-remastered',
    name: 'Monkey Climb Remastered',
    shortDescription: 'Nuestro primer juego ya está listo para jugar directamente desde el navegador.',
    description: 'El primer juego de B&Z Studios ya está disponible. Entrá a su sitio oficial y empezá la partida desde tu navegador.',
    genres: ['Plataformas'],
    status: 'Disponible',
    playUrl: 'https://monkeyclimbremastered.com',
    featured: true,
    seoTitle: 'Monkey Climb Remastered: juego de plataformas online',
    seoDescription: 'Jugá Monkey Climb Remastered online, el primer videojuego de plataformas de B&Z Studios disponible directamente desde el navegador.',
  },
];

export const featuredGames = games.filter((game) => game.featured);

export const getGameBySlug = (slug: string) => games.find((game) => game.slug === slug);
