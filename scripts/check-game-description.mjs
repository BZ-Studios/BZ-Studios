import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_DESCRIPTION_LIMIT, splitGameDescription } from '../Src/lib/game-description.mjs';

test('short and exactly-at-limit descriptions remain complete', () => {
  for (const text of ['', 'Una aventura para todos.', 'a'.repeat(GAME_DESCRIPTION_LIMIT)]) {
    assert.deepEqual(splitGameDescription(`  ${text}  `), { preview: text, remainder: '' });
  }
});

test('long descriptions break at a word and reconstruct the original text', () => {
  const text = 'Jugá al ritmo de la música y descubrí nuevos desafíos. '.repeat(30).trim();
  const { preview, remainder } = splitGameDescription(text);
  assert.ok(Array.from(preview).length <= GAME_DESCRIPTION_LIMIT);
  assert.ok(remainder.length > 0);
  assert.match(remainder, /^\s/);
  assert.ok(!/\s$/.test(preview));
  assert.equal(preview + remainder, text);
});

test('an entire first word is retained even when longer than the threshold', () => {
  const word = 'x'.repeat(GAME_DESCRIPTION_LIMIT + 5);
  assert.deepEqual(splitGameDescription(word), { preview: word, remainder: '' });
  assert.deepEqual(splitGameDescription(`${word} final`), { preview: word, remainder: ' final' });
});

test('Unicode, line breaks and literal markup are preserved as plain text', () => {
  for (const text of [
    '🎮 '.repeat(150) + 'Último desafío.',
    'Acción y precisión.\n\n'.repeat(30) + '¡Tu próxima aventura!',
    '<script>alert("test")</script> '.repeat(20),
  ]) {
    const { preview, remainder } = splitGameDescription(text);
    assert.equal(preview + remainder, text.trim());
    assert.match(remainder, /^\s/);
  }
});
