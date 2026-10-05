import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getYouTubeVideoId } from '../Src/lib/youtube.mjs';

const id = 'xFIRLbDgzXU';
assert.equal(getYouTubeVideoId(`https://youtube.com/shorts/${id}?feature=share`), id);
assert.equal(getYouTubeVideoId(`https://www.youtube.com/watch?v=${id}`), id);
assert.equal(getYouTubeVideoId(`https://youtu.be/${id}`), id);
assert.equal(getYouTubeVideoId(`https://www.youtube.com/embed/${id}`), id);
assert.equal(getYouTubeVideoId('https://example.com/video'), null);

const component = await readFile(new URL('../Src/components/GameMediaGallery.astro', import.meta.url), 'utf8');
for (const marker of ['data-game-media-carousel', 'data-video-play', 'data-media-previous', 'data-media-next']) {
  assert.ok(component.includes(marker), `Falta ${marker} en la galería multimedia`);
}

console.log('Galería multimedia y enlaces de YouTube verificados.');
