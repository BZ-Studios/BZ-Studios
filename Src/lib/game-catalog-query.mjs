const gameSelect = `
  id, slug, name, short_description, description, play_url, trailer_url, video_urls,
  status, platforms, genres, published_at, featured, is_visible,
  play_enabled, preview_desktop_enabled, preview_mobile_enabled,
  seo_title, seo_description, features, controls,
  game_images ( id, storage_path, kind, alt_text, sort_order )
`;
const optionalColumns = ['play_enabled', 'preview_desktop_enabled', 'preview_mobile_enabled', 'video_urls'];

export async function loadPublicGameRows(client) {
  let selection = gameSelect;
  for (let attempt = 0; ; attempt++) {
    const result = await client.from('games').select(selection)
      .eq('is_visible', true)
      .order('featured', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false });
    if (!['42703', 'PGRST204'].includes(result.error?.code) || attempt >= optionalColumns.length) return result;

    // Remove only a column the database explicitly reports missing. A pending
    // preview/video migration must never erase a saved play_enabled=false.
    const missing = optionalColumns.find((column) => selection.includes(column) && result.error.message?.includes(column));
    if (!missing) return result;
    selection = selection.replace(new RegExp(`\\b${missing}\\s*,\\s*`), '');
  }
}
