import { getSupabaseBrowserClient } from '../lib/supabase-browser';
import { normalizeGameGenres } from '../config/gameGenres';
import { refreshInbox } from './inbox';
import { getGameUrl, getPreviewDevices } from '../lib/game-access.mjs';
import { getYouTubeVideoId } from '../lib/youtube.mjs';
import { GAME_STATUSES, type GameStatus } from '../types/game';

type AdminImage = { id: string; storage_path: string; kind: 'cover' | 'banner' | 'screenshot'; alt_text: string | null; sort_order: number; public_url: string };
type AdminGame = Record<string, unknown> & { id: string; name: string; slug: string; game_images: AdminImage[] };

const supabase = getSupabaseBrowserClient();
const form = document.querySelector<HTMLFormElement>('[data-game-form]');
const message = document.querySelector<HTMLElement>('[data-admin-message]');
const mediaBox = document.querySelector<HTMLElement>('[data-current-media]');
const mediaList = document.querySelector<HTMLElement>('[data-media-list]');
const editorTitle = document.querySelector<HTMLElement>('[data-editor-title]');
const editor = document.querySelector<HTMLElement>('[data-game-editor]');
const gameWorkspace = document.querySelector<HTMLElement>('[data-game-workspace]');
const gamesNode = document.querySelector<HTMLScriptElement>('#admin-games');
const games: AdminGame[] = gamesNode?.textContent ? JSON.parse(gamesNode.textContent) : [];

const setMessage = (text: string, kind: 'success' | 'error' = 'success') => {
  if (!message) return;
  message.textContent = text;
  message.dataset.kind = kind;
  message.hidden = false;
  message.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const values = (value: FormDataEntryValue | null) => String(value ?? '').split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
const nullable = (value: FormDataEntryValue | null) => String(value ?? '').trim() || null;
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function resetEditor() {
  form?.reset();
  const id = form?.elements.namedItem('id') as HTMLInputElement | null;
  if (id) id.value = '';
  const visible = form?.elements.namedItem('is_visible') as HTMLInputElement | null;
  if (visible) visible.checked = true;
  if (editorTitle) editorTitle.textContent = 'Nuevo juego';
  if (mediaBox) mediaBox.hidden = true;
  mediaList?.replaceChildren();
}

function openEditor() {
  if (!editor) return;
  editor.hidden = false;
  gameWorkspace?.classList.add('is-editing');
  document.dispatchEvent(new Event('bz:form-controls-refresh'));
  requestAnimationFrame(() => editor.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function closeEditor() {
  resetEditor();
  if (editor) editor.hidden = true;
  gameWorkspace?.classList.remove('is-editing');
  document.querySelector<HTMLButtonElement>('[data-new-game]')?.focus();
}

function renderMedia(game: AdminGame) {
  if (!mediaBox || !mediaList) return;
  mediaList.replaceChildren();
  mediaBox.hidden = game.game_images.length === 0;
  game.game_images.sort((a, b) => a.sort_order - b.sort_order).forEach((image) => {
    const item = document.createElement('article');
    item.className = 'admin-media__item';
    const preview = document.createElement('img');
    preview.src = image.public_url;
    preview.alt = '';
    const row = document.createElement('div');
    row.className = 'admin-media__row';
    const orderInput = document.createElement('input');
    orderInput.type = 'number'; orderInput.min = '0'; orderInput.value = String(image.sort_order);
    orderInput.setAttribute('aria-label', 'Orden');
    const orderButton = document.createElement('button');
    orderButton.type = 'button'; orderButton.className = 'button button--ghost button--small'; orderButton.textContent = 'Ordenar';
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button'; deleteButton.className = 'button button--danger button--small'; deleteButton.textContent = 'Quitar';
    row.append(orderInput, orderButton, deleteButton);
    item.append(preview, row);
    orderButton.addEventListener('click', async () => {
      const { error } = await supabase.from('game_images').update({ sort_order: Number(orderInput?.value ?? 0) }).eq('id', image.id);
      if (error) return setMessage('No se pudo actualizar el orden de la imagen.', 'error');
      setMessage('Orden actualizado.');
    });
    deleteButton.addEventListener('click', async () => {
      if (!confirm('¿Quitar esta imagen?')) return;
      const { error: storageError } = await supabase.storage.from('game-media').remove([image.storage_path]);
      if (storageError) return setMessage('No se pudo eliminar el archivo de imagen.', 'error');
      const { error } = await supabase.from('game_images').delete().eq('id', image.id);
      if (error) return setMessage('No se pudo quitar la imagen del juego.', 'error');
      location.reload();
    });
    mediaList.append(item);
  });
}

function editGame(game: AdminGame) {
  if (!form) return;
  const set = (name: string, value: unknown) => {
    const input = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (input) input.value = value == null ? '' : String(value);
  };
  set('id', game.id); set('name', game.name); set('slug', game.slug);
  set('short_description', game.short_description); set('description', game.description);
  set('play_url', game.play_url); set('trailer_url', game.trailer_url); set('status', game.status);
  set('video_urls', (game.video_urls as string[] | null)?.join('\n'));
  set('published_at', game.published_at); set('platforms', (game.platforms as string[] | null)?.join(', '));
  const selectedGenres = new Set(normalizeGameGenres(game.genres as string[] | null));
  form.querySelectorAll<HTMLInputElement>('input[name="genres"]').forEach((input) => { input.checked = selectedGenres.has(input.value); });
  set('features', (game.features as string[] | null)?.join('\n'));
  set('controls', (game.controls as Array<{ input: string; action: string }> | null)?.map((control) => `${control.input} | ${control.action}`).join('\n'));
  set('seo_title', game.seo_title); set('seo_description', game.seo_description);
  (form.elements.namedItem('featured') as HTMLInputElement).checked = Boolean(game.featured);
  (form.elements.namedItem('is_visible') as HTMLInputElement).checked = Boolean(game.is_visible);
  const previewDevices = getPreviewDevices({
    slug: game.slug,
    status: game.status as GameStatus,
    previewDesktop: typeof game.preview_desktop_enabled === 'boolean' ? game.preview_desktop_enabled : undefined,
    previewMobile: typeof game.preview_mobile_enabled === 'boolean' ? game.preview_mobile_enabled : undefined,
  });
  (form.elements.namedItem('preview_desktop_enabled') as HTMLInputElement).checked = previewDevices.desktop;
  (form.elements.namedItem('preview_mobile_enabled') as HTMLInputElement).checked = previewDevices.mobile;
  if (editorTitle) editorTitle.textContent = `Editar: ${game.name}`;
  renderMedia(game);
  openEditor();
}

async function uploadImages(gameId: string, files: File[], kind: 'cover' | 'screenshot', alt: string) {
  if (!files.length) return;
  const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif']);
  if (files.some((file) => file.size > 8 * 1024 * 1024 || !allowedTypes.has(file.type))) throw new Error('Usá imágenes PNG, JPG, WebP o AVIF de hasta 8 MB.');

  if (kind === 'cover') {
    const { data: oldCovers } = await supabase.from('game_images').select('id, storage_path').eq('game_id', gameId).eq('kind', 'cover');
    const paths = (oldCovers ?? []).map((image: { storage_path: string }) => image.storage_path);
    if (paths.length) await supabase.storage.from('game-media').remove(paths);
    if (oldCovers?.length) await supabase.from('game_images').delete().in('id', oldCovers.map((image: { id: string }) => image.id));
  }

  const { data: existing } = await supabase.from('game_images').select('sort_order').eq('game_id', gameId).order('sort_order', { ascending: false }).limit(1);
  let order = Number(existing?.[0]?.sort_order ?? -1) + 1;
  for (const file of files) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    const path = `${gameId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('game-media').upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error('No se pudo subir una de las imágenes. Revisá su tamaño y formato.');
    const { error: rowError } = await supabase.from('game_images').insert({ game_id: gameId, storage_path: path, kind, alt_text: alt, sort_order: kind === 'cover' ? 0 : order++ });
    if (rowError) throw new Error('La imagen se subió, pero no se pudo asociar al juego.');
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  submit?.setAttribute('disabled', '');
  try {
    const data = new FormData(form);
    const id = nullable(data.get('id'));
    const genres = data.getAll('genres').map(String).filter(Boolean);
    if (!genres.length) throw new Error('Elegí al menos un género.');
    const playUrl = nullable(data.get('play_url'));
    const trailerUrl = nullable(data.get('trailer_url'));
    const videoUrls = values(data.get('video_urls'));
    if ([playUrl, trailerUrl].some((url) => url && !getGameUrl(url))) throw new Error('Los enlaces deben ser direcciones HTTP o HTTPS válidas, sin usuario ni contraseña.');
    if (videoUrls.some((url) => !getYouTubeVideoId(url))) throw new Error('Usá enlaces válidos de YouTube para los videos adicionales.');
    if (!GAME_STATUSES.includes(String(data.get('status')) as GameStatus)) throw new Error('Elegí un estado válido para el juego.');
    const controls = String(data.get('controls') ?? '').split('\n').map((line) => line.split('|').map((part) => part.trim())).filter((pair) => pair[0] && pair[1]).map(([input, action]) => ({ input, action }));
    const payload = {
      name: String(data.get('name') ?? '').trim(), slug: slugify(String(data.get('slug') ?? '')),
      short_description: String(data.get('short_description') ?? '').trim(), description: String(data.get('description') ?? '').trim(),
      play_url: playUrl, trailer_url: trailerUrl, video_urls: videoUrls, status: String(data.get('status')),
      preview_desktop_enabled: data.get('preview_desktop_enabled') === 'on',
      preview_mobile_enabled: data.get('preview_mobile_enabled') === 'on',
      platforms: values(data.get('platforms')), genres, published_at: nullable(data.get('published_at')),
      featured: data.get('featured') === 'on', is_visible: data.get('is_visible') === 'on',
      seo_title: nullable(data.get('seo_title')), seo_description: nullable(data.get('seo_description')),
      features: String(data.get('features') ?? '').split('\n').map((item) => item.trim()).filter(Boolean), controls,
    };
    const query = id ? supabase.from('games').update(payload).eq('id', id) : supabase.from('games').insert(payload);
    const { data: saved, error } = await query.select('id').single();
    if (error) throw new Error(['42703', 'PGRST204'].includes(error.code) ? 'Falta aplicar la migración 202610210001_game_preview_devices.sql en Supabase para guardar las opciones de vista previa.' : 'No se pudo guardar el juego. Revisá que el nombre y la dirección sean únicos.');
    const cover = data.get('cover');
    const screenshots = data.getAll('screenshots').filter((file): file is File => file instanceof File && file.size > 0);
    await uploadImages(saved.id, cover instanceof File && cover.size ? [cover] : [], 'cover', `Portada de ${payload.name}`);
    await uploadImages(saved.id, screenshots, 'screenshot', `Captura de ${payload.name}`);
    setMessage('Juego guardado correctamente.');
    location.reload();
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'No se pudo guardar el juego.', 'error');
  } finally { submit?.removeAttribute('disabled'); }
});

document.querySelectorAll<HTMLElement>('[data-edit-game]').forEach((button) => button.addEventListener('click', () => editGame(JSON.parse(button.dataset.editGame ?? '{}'))));
document.querySelectorAll<HTMLButtonElement>('[data-toggle-game]').forEach((button) => button.addEventListener('click', async () => {
  button.disabled = true;
  const { error } = await supabase.from('games').update({ is_visible: button.dataset.visible !== 'true' }).eq('id', button.dataset.toggleGame);
  if (error) { setMessage('No se pudo cambiar la visibilidad del juego.', 'error'); button.disabled = false; } else location.reload();
}));
document.querySelectorAll<HTMLButtonElement>('[data-delete-game]').forEach((button) => button.addEventListener('click', async () => {
  if (!confirm(`¿Eliminar definitivamente “${button.dataset.gameName}” y sus imágenes?`)) return;
  button.disabled = true;
  const game = games.find((item) => item.id === button.dataset.deleteGame);
  const paths = game?.game_images.map((image) => image.storage_path) ?? [];
  if (paths.length) await supabase.storage.from('game-media').remove(paths);
  const { error } = await supabase.from('games').delete().eq('id', button.dataset.deleteGame);
  if (error) { setMessage('No se pudo eliminar el juego.', 'error'); button.disabled = false; } else location.reload();
}));

document.querySelector('[data-new-game]')?.addEventListener('click', () => { resetEditor(); openEditor(); });
document.querySelector('[data-cancel-edit]')?.addEventListener('click', closeEditor);
document.querySelector('[data-close-editor]')?.addEventListener('click', closeEditor);
const nameInput = form?.elements.namedItem('name') as HTMLInputElement | null;
nameInput?.addEventListener('input', () => {
  if (!form) return;
  const id = (form.elements.namedItem('id') as HTMLInputElement).value;
  const slug = form.elements.namedItem('slug') as HTMLInputElement;
  if (!id && slug) slug.value = slugify((form.elements.namedItem('name') as HTMLInputElement).value);
});

const accountSearch = document.querySelector<HTMLInputElement>('[data-account-search]');
const accountGame = document.querySelector<HTMLSelectElement>('[data-account-game]');
const accountCards = Array.from(document.querySelectorAll<HTMLDetailsElement>('[data-account-card]'));
const normalizeAccountSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function filterAccounts() {
  const query = normalizeAccountSearch(accountSearch?.value ?? '');
  const gameId = accountGame?.value ?? '';
  let count = 0;
  accountCards.forEach((card) => {
    card.hidden = !normalizeAccountSearch(card.dataset.accountSearchText ?? '').includes(query)
      || Boolean(gameId && !card.dataset.accountGames?.split(' ').includes(gameId));
    if (!card.hidden) count++;
  });
  const counter = document.querySelector('[data-account-count]');
  if (counter) counter.textContent = `${count} ${count === 1 ? 'cuenta' : 'cuentas'}`;
  const empty = document.querySelector<HTMLElement>('[data-accounts-empty]');
  if (empty) empty.hidden = count > 0;
}
accountSearch?.addEventListener('input', filterAccounts);
accountGame?.addEventListener('change', filterAccounts);
if (accountCards.length) filterAccounts();

function instagramUrl(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const handle = raw
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
    .trim();
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) throw new Error('Ingresá un usuario de Instagram válido.');
  return `https://www.instagram.com/${handle}/`;
}

document.querySelectorAll<HTMLFormElement>('[data-member-form]').forEach((memberForm) => memberForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = memberForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  submit?.setAttribute('disabled', '');
  try {
    const data = new FormData(memberForm);
    const id = String(data.get('id') ?? '');
    const name = String(data.get('name') ?? '').trim();
    const role = String(data.get('role') ?? '').trim();
    const sortOrder = Number(data.get('sort_order') ?? 0);
    if (!id || name.length < 2 || role.length < 2) throw new Error('Completá el nombre y la descripción del integrante.');
    const { error } = await supabase.from('site_members').upsert({
      id,
      name,
      role,
      instagram_url: instagramUrl(data.get('instagram_url')),
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      is_visible: data.get('is_visible') === 'on',
    }, { onConflict: 'id' });
    if (error) throw new Error('No se pudo guardar el perfil del integrante.');
    setMessage(`Perfil de ${name} actualizado.`);
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'No se pudo guardar el perfil.', 'error');
  } finally {
    submit?.removeAttribute('disabled');
  }
}));

document.querySelectorAll<HTMLButtonElement>('[data-read-message]').forEach((button) => button.addEventListener('click', async () => {
  button.disabled = true;
  const { error } = await supabase.from('contact_messages').update({ is_read: true }).eq('id', button.dataset.readMessage);
  if (error) {
    setMessage('No se pudo marcar el mensaje como leído.', 'error');
    button.disabled = false;
    return;
  }
  const card = button.closest<HTMLElement>('[data-message-card]');
  card?.classList.remove('is-unread');
  if (card) {
    card.dataset.read = 'true';
    const state = card.querySelector('[data-read-state]');
    if (state) state.textContent = 'Leído';
  }
  button.remove();
  refreshInbox();
  setMessage('Mensaje marcado como leído.');
}));

document.querySelectorAll<HTMLButtonElement>('[data-delete-message]').forEach((button) => button.addEventListener('click', async () => {
  if (!confirm('¿Eliminar definitivamente este mensaje?')) return;
  button.disabled = true;
  const { error } = await supabase.from('contact_messages').delete().eq('id', button.dataset.deleteMessage);
  if (error) {
    setMessage('No se pudo eliminar el mensaje.', 'error');
    button.disabled = false;
    return;
  }
  button.closest<HTMLElement>('[data-message-card]')?.remove();
  refreshInbox();
  setMessage('Mensaje eliminado.');
}));
document.querySelectorAll<HTMLFormElement>('[data-confirm-message]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (!confirm(form.dataset.confirmMessage ?? '¿Confirmar esta acción?')) event.preventDefault();
  });
});
