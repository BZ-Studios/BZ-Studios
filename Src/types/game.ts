export const GAME_STATUSES = ['Disponible', 'En desarrollo', 'Demo', 'Próximamente'] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

export interface GameControl {
  input: string;
  action: string;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  cover?: string;
  screenshots?: string[];
  trailerUrl?: string;
  platforms?: string[];
  genres: string[];
  status: GameStatus;
  playUrl?: string;
  controls?: GameControl[];
  features?: string[];
  publishedAt?: string;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  ratingAverage?: number;
  ratingCount?: number;
}
