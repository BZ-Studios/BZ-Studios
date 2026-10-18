import assert from 'node:assert/strict';
import { serializeInlineJson, escapeHtml, isSameOriginRequest, readLimitedFormData } from '../Src/lib/security.mjs';
import { parseContactForm, CONTACT_LIMITS } from '../Src/lib/contact.mjs';
import { getYouTubeVideoId } from '../Src/lib/youtube.mjs';

const payload = '</script><script>alert("xss")</script>&\u2028\u2029';
const encoded = serializeInlineJson({ name: payload });
assert.ok(!encoded.includes('<'));
assert.ok(!encoded.includes('&'));
assert.deepEqual(JSON.parse(encoded), { name: payload });
assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');

const makeForm = (overrides = {}) => {
  const data = new FormData();
  for (const [name, value] of Object.entries({ name: 'Persona de prueba', email: 'persona@example.com', category: 'Consulta', message: 'Mensaje de prueba válido.', ...overrides })) data.set(name, value);
  return data;
};
assert.ok(parseContactForm(makeForm()));
for (const override of [{ name: 'a' }, { name: 'a'.repeat(101) }, { email: 'bad\r\nBcc:a@example.com' }, { name: 'Nombre\nBcc:otro' }, { category: 'Inventada' }, { message: 'corto' }, { message: 'a'.repeat(5001) }, { message: 'a\0b'.repeat(10) }]) assert.equal(parseContactForm(makeForm(override)), null);
assert.ok(parseContactForm(makeForm({ message: 'a'.repeat(CONTACT_LIMITS.messageMax) })));
const injection = makeForm({ message: "<script>alert(1)</script> '); DROP TABLE games; --" });
assert.equal(parseContactForm(injection).message, injection.get('message'), 'El texto se guarda como dato; no hay que alterar reportes de errores que incluyan código');
const duplicated = makeForm(); duplicated.append('email', 'second@example.com');
assert.equal(parseContactForm(duplicated), null);
const file = makeForm(); file.set('message', new Blob(['not text']), 'payload.txt');
assert.equal(parseContactForm(file), null);

const request = headers => new Request('https://bzstudios.com.ar/api/contact', { headers });
assert.equal(isSameOriginRequest(request({ origin: 'https://bzstudios.com.ar' })), true);
assert.equal(isSameOriginRequest(request({ origin: 'https://evil.example' })), false);
assert.equal(isSameOriginRequest(request({ origin: 'null' })), false);
assert.equal(isSameOriginRequest(request({ 'sec-fetch-site': 'cross-site' })), false);
const formRequest = body => new Request('https://bzstudios.com.ar/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
assert.equal((await readLimitedFormData(formRequest('name=Test'), 20)).get('name'), 'Test');
await assert.rejects(readLimitedFormData(formRequest('x'.repeat(21)), 20), RangeError);
const largeDeclared = formRequest('x'); largeDeclared.headers.set('Content-Length', '30');
await assert.rejects(readLimitedFormData(largeDeclared, 20), RangeError);
assert.equal(getYouTubeVideoId('javascript://youtube.com/watch?v=xFIRLbDgzXU'), null);
assert.equal(getYouTubeVideoId('https://user:pass@youtube.com/watch?v=xFIRLbDgzXU'), null);
console.log('Serialización anti-XSS, contacto, cabeceras de correo, origen, URLs y límite de cuerpo verificados.');
