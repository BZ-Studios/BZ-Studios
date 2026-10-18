import assert from 'node:assert/strict';
import { getGameAccess, getGameUrl } from '../Src/lib/game-access.mjs';

const base = { slug: 'test-game', playUrl: 'https://game.example/' };
const access = (status, playUrl = base.playUrl) => getGameAccess({ ...base, status, playUrl });

for (const status of ['Disponible', 'Demo']) {
  assert.equal(access(status).canPlay, true);
  assert.equal(access(status).isPreview, false);
  assert.equal(access(status).href, base.playUrl);
  assert.equal(access(status, '').href, undefined);
}

const preview = access('En desarrollo');
assert.equal(preview.canPlay, false);
assert.equal(preview.isPreview, true);
assert.equal(preview.href, '/juegos/test-game/vista-previa/');
assert.notEqual(preview.href, base.playUrl, 'La vista previa no debe abrir el juego directamente');
assert.equal(access('En desarrollo', '').href, preview.href, 'Sin URL debe poder mostrar el material publicado');
assert.equal(access('Próximamente').href, undefined);
assert.equal(access('Próximamente').canPlay, false);

for (const value of ['', undefined, '/relative', 'javascript:alert(1)', 'data:text/html,test', 'ftp://game.example', 'https://user:pass@game.example']) {
  assert.equal(getGameUrl(value), undefined, `No se debe cargar una URL no válida: ${value}`);
  assert.equal(access('Disponible', value ?? '').canPlay, false);
}
assert.equal(getGameUrl(' https://game.example/path?demo=1#intro '), 'https://game.example/path?demo=1#intro');
assert.equal(getGameUrl('http://localhost:4321/game'), 'http://localhost:4321/game');

console.log('Acceso por estado y URLs de juegos verificados.');
