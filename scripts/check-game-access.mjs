import assert from 'node:assert/strict';
import { getGameAccess, getGameUrl, getPreviewDevices } from '../Src/lib/game-access.mjs';
import { recommendGames } from '../Src/lib/game-recommendations.mjs';
import { loadPublicGameRows } from '../Src/lib/game-catalog-query.mjs';

const base = { slug: 'test-game', playUrl: 'https://game.example/' };
const access = (status, playUrl = base.playUrl) => getGameAccess({ ...base, status, playUrl });

for (const status of ['Disponible', 'Demo', 'En desarrollo']) {
  assert.equal(access(status).canPlay, true);
  assert.equal(access(status).href, base.playUrl);
  assert.equal(access(status, '').href, undefined);
}

for (const status of ['Disponible', 'Demo', 'En desarrollo', 'Próximamente']) {
  for (const playEnabled of [true, false, undefined]) {
    const game = { ...base, status, playEnabled, previewDesktop: true, previewMobile: false };
    const result = getGameAccess(game);
    const expected = status !== 'Próximamente' && playEnabled !== false;
    assert.equal(result.canPlay, expected, `${status}, playEnabled=${playEnabled}`);
    assert.equal(result.href, expected ? base.playUrl : undefined);
    assert.equal(result.canPreview, status !== 'Próximamente', 'Deshabilitar Jugar no cambia la vista previa');
    assert.equal(result.playUrl, base.playUrl, 'Deshabilitar Jugar conserva la URL de la vista previa');
  }
}
const released = { ...base, status: 'Disponible', playEnabled: false };
assert.equal(getGameAccess({ ...released, playEnabled: true }).href, base.playUrl, 'Rehabilitar debe restaurar el mismo enlace');

const preview = access('En desarrollo');
assert.equal(preview.canPreview, true);
assert.equal(preview.previewHref, '/juegos/test-game/vista-previa/');
assert.notEqual(preview.previewHref, preview.href, 'La vista previa es un acceso independiente de Jugar');
assert.equal(access('En desarrollo', '').previewHref, preview.previewHref, 'Sin URL debe poder mostrar el material publicado');
assert.equal(access('Próximamente').href, undefined);
assert.equal(access('Próximamente').canPlay, false);
assert.equal(access('Próximamente').canPreview, false);

for (const status of ['Disponible', 'Demo', 'En desarrollo']) {
  for (const desktop of [false, true]) {
    for (const mobile of [false, true]) {
      const game = { ...base, status, previewDesktop: desktop, previewMobile: mobile };
      assert.deepEqual(getPreviewDevices(game), { desktop, mobile });
      assert.equal(getGameAccess(game).canPreview, desktop || mobile);
      assert.equal(getGameAccess(game).href, base.playUrl, 'Las preferencias de vista previa no deben cambiar Jugar');
    }
  }
}
for (const slug of ['monkey-climb-remastered', 'ufo-run']) {
  assert.deepEqual(getPreviewDevices({ slug, status: 'Disponible' }), { desktop: true, mobile: true });
}
assert.deepEqual(getPreviewDevices({ slug: 'aura-battle', status: 'En desarrollo' }), { desktop: true, mobile: false });

for (const value of ['', undefined, '/relative', 'javascript:alert(1)', 'data:text/html,test', 'ftp://game.example', 'https://user:pass@game.example']) {
  assert.equal(getGameUrl(value), undefined, `No se debe cargar una URL no válida: ${value}`);
  assert.equal(access('Disponible', value ?? '').canPlay, false);
}
assert.equal(getGameUrl(' https://game.example/path?demo=1#intro '), 'https://game.example/path?demo=1#intro');
assert.equal(getGameUrl('http://localhost:4321/game'), 'http://localhost:4321/game');

const candidates = [
  { slug: 'current', ratingAverage: 5, ratingCount: 100 },
  { slug: 'top', ratingAverage: 4.9, ratingCount: 10 },
  { slug: 'second', ratingAverage: 4.8, ratingCount: 20 },
  { slug: 'new', ratingCount: 0 },
  { slug: 'fourth', ratingAverage: 3, ratingCount: 2 },
  { slug: 'top', ratingAverage: 4.9, ratingCount: 10 },
];
const selection = recommendGames(candidates, 'current', () => 0);
assert.equal(selection[0].slug, 'top');
assert.equal(selection.length, 3);
assert.equal(new Set(selection.map((game) => game.slug)).size, 3);
assert.ok(!selection.some((game) => game.slug === 'current'));
assert.equal(candidates.length, 6, 'La selección no debe mutar el catálogo');
assert.deepEqual(recommendGames([], 'current'), []);
assert.equal(recommendGames(candidates.slice(0, 3), 'current').length, 2, 'No inventar ni duplicar juegos si hay menos de tres');
assert.notDeepEqual(recommendGames(candidates, 'current', () => 0), recommendGames(candidates, 'current', () => .99), 'Las posiciones después del mejor calificado deben variar');

// Exercise schema-transition reads: missing preview/video fields must not
// discard an existing disabled play button, or drop published-only filtering.
function catalogClient(missingColumns, finalError = null) {
  const selections = [];
  let selection;
  const client = { from(table) {
    assert.equal(table, 'games');
    const request = {
      select(value) { selection = value; selections.push(value); return this; },
      eq(column, value) { assert.equal(column, 'is_visible'); assert.equal(value, true); return this; },
      order() { return this; },
      then(resolve, reject) {
        const missing = missingColumns.find((column) => selection.includes(column));
        return Promise.resolve(missing
          ? { data: null, error: { code: '42703', message: `column games.${missing} does not exist` } }
          : { data: [{ play_enabled: false }], error: finalError }).then(resolve, reject);
      },
    };
    return request;
  } };
  return { client, selections };
}
for (const missing of [[], ['play_enabled'], ['preview_desktop_enabled', 'preview_mobile_enabled', 'video_urls'], ['play_enabled', 'preview_desktop_enabled', 'preview_mobile_enabled', 'video_urls']]) {
  const { client, selections } = catalogClient(missing);
  const result = await loadPublicGameRows(client);
  assert.equal(result.error, null);
  assert.equal(selections.length, missing.length + 1);
  for (const field of missing) assert.ok(!selections.at(-1).includes(field));
  if (!missing.includes('play_enabled')) {
    assert.ok(selections.at(-1).includes('play_enabled'));
    assert.equal(result.data[0].play_enabled, false);
  }
}
const missingRequired = { code: '42703', message: 'column games.name does not exist' };
const { client: invalidSchema, selections: invalidSelections } = catalogClient([], missingRequired);
assert.equal((await loadPublicGameRows(invalidSchema)).error, missingRequired);
assert.equal(invalidSelections.length, 1, 'No ocultar errores de campos obligatorios ni reintentar indefinidamente');
console.log('Control de Jugar, compatibilidad de esquema, vistas previas, URLs y recomendaciones verificados.');
