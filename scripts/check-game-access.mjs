import assert from 'node:assert/strict';
import { getGameAccess, getGameUrl, getPreviewDevices } from '../Src/lib/game-access.mjs';
import { recommendGames } from '../Src/lib/game-recommendations.mjs';

const base = { slug: 'test-game', playUrl: 'https://game.example/' };
const access = (status, playUrl = base.playUrl) => getGameAccess({ ...base, status, playUrl });

for (const status of ['Disponible', 'Demo', 'En desarrollo']) {
  assert.equal(access(status).canPlay, true);
  assert.equal(access(status).href, base.playUrl);
  assert.equal(access(status, '').href, undefined);
}

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
console.log('Jugar, vistas previas por dispositivo, URLs y recomendaciones sin duplicados verificados.');
