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
  const canPlay = Boolean(playUrl && ['Disponible', 'Demo', 'En desarrollo'].includes(game.status));
  const previewDevices = getPreviewDevices(game);
  const canPreview = game.status !== 'Próximamente' && (previewDevices.desktop || previewDevices.mobile);
  return {
    canPlay,
    canPreview,
    previewDevices,
    playUrl,
    previewHref: canPreview ? `/juegos/${encodeURIComponent(game.slug)}/vista-previa/` : undefined,
    href: canPlay ? playUrl : undefined,
  };
}

/** Defaults also keep the catalog usable before the preview migration is applied.
 * @param {Pick<import('../types/game').Game, 'slug' | 'status' | 'previewDesktop' | 'previewMobile'>} game
 */
export function getPreviewDevices(game) {
  const knownMobilePreview = ['monkey-climb-remastered', 'ufo-run'].includes(game.slug);
  return {
    desktop: game.previewDesktop ?? game.status !== 'Próximamente',
    mobile: game.previewMobile ?? knownMobilePreview,
  };
}
