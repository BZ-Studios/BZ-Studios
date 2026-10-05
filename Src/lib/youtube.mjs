const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extracts a safe YouTube video id from regular, shortened, embed, live and Shorts URLs.
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
export function getYouTubeVideoId(value) {
  if (!value) return null;
  const candidate = value.trim();
  if (YOUTUBE_ID_PATTERN.test(candidate)) return candidate;

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    let id = '';

    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? '';
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v') ?? '';
      else {
        const [kind, pathId] = url.pathname.split('/').filter(Boolean);
        if (['shorts', 'embed', 'live'].includes(kind)) id = pathId ?? '';
      }
    }

    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** @param {string} id */
export const getYouTubeEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`;

/** @param {string} id */
export const getYouTubeThumbnailUrl = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
