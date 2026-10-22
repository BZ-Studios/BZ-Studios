export const GAME_DESCRIPTION_LIMIT = 300;

/** Split plain text at a word boundary, retaining the original full text.
 * @param {string} description
 */
export function splitGameDescription(description) {
  const text = description.trim();
  const characters = Array.from(text);
  if (characters.length <= GAME_DESCRIPTION_LIMIT) return { preview: text, remainder: '' };

  let boundary = GAME_DESCRIPTION_LIMIT;
  while (boundary > 0 && !/\s/u.test(characters[boundary])) boundary--;
  // An unusually long first word is shown whole, never cut in the middle.
  if (boundary === 0) {
    boundary = GAME_DESCRIPTION_LIMIT;
    while (boundary < characters.length && !/\s/u.test(characters[boundary])) boundary++;
  }
  while (boundary > 0 && /\s/u.test(characters[boundary - 1])) boundary--;
  return { preview: characters.slice(0, boundary).join(''), remainder: characters.slice(boundary).join('') };
}
