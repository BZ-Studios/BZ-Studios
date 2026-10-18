/** Serialize data inside a script element without allowing an HTML closing tag. @param {unknown} value */
export function serializeInlineJson(value) {
  return (JSON.stringify(value) ?? 'null').replace(/[<>&\u2028\u2029]/g, character => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029',
  })[character] ?? character);
}

/** @param {string} value */
export const escapeHtml = value => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[character] ?? character);

/** @param {Request} request */
export function isSameOriginRequest(request) {
  const origin = request.headers.get('origin');
  return request.headers.get('sec-fetch-site') !== 'cross-site'
    && (!origin || origin === new URL(request.url).origin);
}

/** Enforce a byte limit even when Content-Length is missing. @param {Request} request @param {number} maxBytes */
export async function readLimitedFormData(request, maxBytes) {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) throw new RangeError('Request body too large');
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) { await reader.cancel(); throw new RangeError('Request body too large'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new Response(body, { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData();
}
