import type { Game, GameControl, GameStatus } from '../types/game';
import { games as fallbackGames } from '../data/games';
import { normalizeGameGenres } from '../config/gameGenres';
import { createPublicClient } from './supabase';
import { getGameUrl } from './game-access.mjs';
import { loadPublicGameRows } from './game-catalog-query.mjs';

interface GameImageRow {
  id: string;
  storage_path: string;
  kind: 'cover' | 'banner' | 'screenshot';
  alt_text: string | null;
  sort_order: number;
}

interface GameRow {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  play_url: string | null;
  play_enabled?: boolean;
  preview_desktop_enabled?: boolean;
  preview_mobile_enabled?: boolean;
  trailer_url: string | null;
  video_urls: string[] | null;
  status: GameStatus;
  platforms: string[] | null;
  genres: string[] | null;
  published_at: string | null;
  featured: boolean;
  is_visible: boolean;
  seo_title: string | null;
  seo_description: string | null;
  features: string[] | null;
  controls: GameControl[] | null;
  game_images: GameImageRow[] | null;
}

function publicImageUrl(path: string) {
  const client = createPublicClient();
  return client?.storage.from('game-media').getPublicUrl(path).data.publicUrl;
}

function mapGame(row: GameRow): Game {
  const images = [...(row.game_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const cover = images.find((image) => image.kind === 'cover');
  const screenshots = images
    .filter((image) => image.kind === 'screenshot')
    .map((image) => publicImageUrl(image.storage_path))
    .filter((url): url is string => Boolean(url));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    cover: cover ? publicImageUrl(cover.storage_path) : undefined,
    screenshots,
    trailerUrl: getGameUrl(row.trailer_url ?? undefined),
    videoUrls: row.video_urls ?? [],
    platforms: row.platforms ?? [],
    genres: normalizeGameGenres(row.genres),
    status: row.status,
    playUrl: getGameUrl(row.play_url ?? undefined),
    playEnabled: row.play_enabled,
    previewDesktop: row.preview_desktop_enabled,
    previewMobile: row.preview_mobile_enabled,
    controls: row.controls ?? [],
    features: row.features ?? [],
    publishedAt: row.published_at ?? undefined,
    featured: row.featured,
    seoTitle: row.seo_title || row.name,
    seoDescription: row.seo_description || row.short_description,
  };
}

async function addRatings(games: Game[], client: NonNullable<ReturnType<typeof createPublicClient>>) {
  const { data } = await client.from('game_rating_stats').select('game_id, average_score, rating_count');
  const ratings = new Map((data ?? []).map((row) => [row.game_id, row]));
  return games.map((game) => {
    const rating = ratings.get(game.id);
    return { ...game, ratingAverage: rating ? Number(rating.average_score) : undefined, ratingCount: rating ? Number(rating.rating_count) : 0 };
  });
}

export async function getPublicGames(): Promise<Game[]> {
  const client = createPublicClient();
  if (!client) return fallbackGames;

  const { data, error } = await loadPublicGameRows(client);

  if (error || !data) return fallbackGames;
  return addRatings((data as unknown as GameRow[]).map(mapGame), client);
}

export async function getPublicGameBySlug(slug: string): Promise<Game | undefined> {
  const games = await getPublicGames();
  return games.find((game) => game.slug === slug);
}
