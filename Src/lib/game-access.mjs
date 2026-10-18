/** @param {string | undefined} value */
export function getGameUrl(value) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

/** @param {import('../types/game').Game} game */
export function getGameAccess(game) {
  const playUrl = getGameUrl(game.playUrl);
  const isPreview = game.status === 'En desarrollo';
  const canPlay = Boolean(playUrl && (game.status === 'Disponible' || game.status === 'Demo'));
  return {
    isPreview,
    canPlay,
    playUrl,
    href: isPreview ? `/juegos/${game.slug}/vista-previa/` : canPlay ? playUrl : undefined,
  };
}
