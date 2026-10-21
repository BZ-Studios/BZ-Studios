/** Highest-rated other game first, followed by up to two different random games.
 * @template {{slug: string, ratingAverage?: number, ratingCount?: number}} T
 * @param {T[]} games
 * @param {string} currentSlug
 * @param {() => number} random
 * @returns {T[]}
 */
export function recommendGames(games, currentSlug, random = Math.random) {
  const candidates = games.filter((game, index) => game.slug !== currentSlug
    && games.findIndex((item) => item.slug === game.slug) === index);
  if (!candidates.length) return [];
  const rated = candidates.filter((game) => (game.ratingCount ?? 0) > 0 && Number.isFinite(game.ratingAverage));
  rated.sort((a, b) => (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0)
    || (b.ratingCount ?? 0) - (a.ratingCount ?? 0) || a.slug.localeCompare(b.slug));
  const top = rated[0];
  const rest = candidates.filter((game) => game !== top);
  for (let index = rest.length - 1; index > 0; index--) {
    const swap = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
    [rest[index], rest[swap]] = [rest[swap], rest[index]];
  }
  return (top ? [top, ...rest] : rest).slice(0, 3);
}
