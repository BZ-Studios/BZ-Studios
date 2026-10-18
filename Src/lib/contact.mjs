export const CONTACT_LIMITS = { nameMin: 2, nameMax: 100, emailMax: 254, messageMin: 10, messageMax: 5000, bodyMax: 96 * 1024 };
export const CONTACT_CATEGORIES = ['Idea', 'Sugerencia', 'Problema', 'Apelación', 'Feedback sobre un juego', 'Consulta', 'Otro'];

/** @param {FormData} form */
export function parseContactForm(form) {
  const fields = ['name', 'email', 'category', 'message'];
  if (fields.some(field => form.getAll(field).length !== 1 || typeof form.get(field) !== 'string')) return null;
  const name = String(form.get('name')).trim();
  const email = String(form.get('email')).trim().toLowerCase();
  const category = String(form.get('category')).trim();
  const message = String(form.get('message')).trim();
  // Names and addresses also appear in email headers; keep them on one line.
  const controlCharacters = /[\u0000-\u001f\u007f]/;
  if (name.length < CONTACT_LIMITS.nameMin || name.length > CONTACT_LIMITS.nameMax || controlCharacters.test(name)
    || email.length > CONTACT_LIMITS.emailMax || controlCharacters.test(email) || !/^[^\s@<>"(),;:]+@[^\s@<>"(),;:]+\.[^\s@<>"(),;:]+$/.test(email)
    || !CONTACT_CATEGORIES.includes(category) || message.includes('\u0000')
    || message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.messageMax) return null;
  return { name, email, category, message };
}
