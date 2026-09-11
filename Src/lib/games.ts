import type { Game, GameControl, GameStatus } from '../types/game';
import { games as fallbackGames } from '../data/games';
import { createPublicClient } from './supabase';

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
  trailer_url: string | null;
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
    trailerUrl: row.trailer_url ?? undefined,
    platforms: row.platforms ?? [],
    genres: row.genres ?? [],
    status: row.status,
    playUrl: row.play_url ?? undefined,
    controls: row.controls ?? [],
    features: row.features ?? [],
    publishedAt: row.published_at ?? undefined,
    featured: row.featured,
    seoTitle: row.seo_title || row.name,
    seoDescription: row.seo_description || row.short_description,
  };
}

const gameSelect = `
  id, slug, name, short_description, description, play_url, trailer_url,
  status, platforms, genres, published_at, featured, is_visible,
  seo_title, seo_description, features, controls,
  game_images ( id, storage_path, kind, alt_text, sort_order )
`;

export async function getPublicGames(): Promise<Game[]> {
  const client = createPublicClient();
  if (!client) return fallbackGames;

  const { data, error } = await client
    .from('games')
    .select(gameSelect)
    .eq('is_visible', true)
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false });

  if (error || !data) return fallbackGames;
  return (data as unknown as GameRow[]).map(mapGame);
}

export async function getPublicGameBySlug(slug: string): Promise<Game | undefined> {
  const games = await getPublicGames();
  return games.find((game) => game.slug === slug);
}
