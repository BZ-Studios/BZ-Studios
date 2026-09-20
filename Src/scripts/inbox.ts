const inboxSearch = document.querySelector<HTMLInputElement>('[data-inbox-search]');
const inboxFilter = document.querySelector<HTMLSelectElement>('[data-inbox-filter]');
const inboxCategory = document.querySelector<HTMLSelectElement>('[data-inbox-category]');
const inboxFrom = document.querySelector<HTMLInputElement>('[data-inbox-from]');
const inboxTo = document.querySelector<HTMLInputElement>('[data-inbox-to]');
const inboxOrder = document.querySelector<HTMLSelectElement>('[data-inbox-order]');
const inboxClear = document.querySelector<HTMLButtonElement>('[data-inbox-clear]');
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export function refreshInbox() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-message-card]'));
  const search = normalizeSearch(inboxSearch?.value.trim() ?? '');
  const filter = inboxFilter?.value ?? 'all';
  const category = inboxCategory?.value ?? 'all';
  const from = inboxFrom?.value ? new Date(`${inboxFrom.value}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const to = inboxTo?.value ? new Date(`${inboxTo.value}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  const inbox = document.querySelector<HTMLElement>('[data-inbox]');
  let visible = 0;
  cards.sort((a, b) => {
    const difference = new Date(b.dataset.created ?? 0).getTime() - new Date(a.dataset.created ?? 0).getTime();
    return inboxOrder?.value === 'oldest' ? -difference : difference;
  }).forEach((card) => inbox?.append(card));
  cards.forEach((card) => {
    const matchesState = filter === 'all' || (filter === 'read' ? card.dataset.read === 'true' : card.dataset.read !== 'true');
    const matchesCategory = category === 'all' || card.dataset.category === category;
    const created = new Date(card.dataset.created ?? 0).getTime();
    const matchesDate = created >= from && created <= to;
    card.hidden = !matchesState || !matchesCategory || !matchesDate || !normalizeSearch(card.dataset.search ?? '').includes(search);
    if (!card.hidden) visible += 1;
  });
  const unread = cards.filter((card) => card.dataset.read !== 'true').length;
  const count = document.querySelector('[data-inbox-count]');
  if (count) count.textContent = `${visible} de ${cards.length} mensajes · ${unread} sin leer`;
  const empty = document.querySelector<HTMLElement>('[data-inbox-empty]');
  if (empty) empty.hidden = visible > 0;
  const unreadStat = document.querySelector('[data-unread-count]');
  if (unreadStat) unreadStat.textContent = String(unread);
  const totalStat = document.querySelector('[data-message-total]');
  if (totalStat) totalStat.textContent = `${cards.length} en la bandeja`;
}

inboxSearch?.addEventListener('input', refreshInbox);
inboxFilter?.addEventListener('change', refreshInbox);
[inboxCategory, inboxFrom, inboxTo, inboxOrder].forEach((control) => control?.addEventListener('change', refreshInbox));
inboxClear?.addEventListener('click', () => {
  if (inboxSearch) inboxSearch.value = '';
  if (inboxFilter) inboxFilter.value = 'all';
  if (inboxCategory) inboxCategory.value = 'all';
  if (inboxFrom) inboxFrom.value = '';
  if (inboxTo) inboxTo.value = '';
  if (inboxOrder) inboxOrder.value = 'newest';
  refreshInbox();
  inboxSearch?.focus();
});
refreshInbox();
document.querySelectorAll<HTMLTextAreaElement>('[data-reply-draft]').forEach((draft) => {
  draft.addEventListener('input', () => {
    const link = draft.closest('.inbox-reply')?.querySelector<HTMLAnchorElement>('[data-reply-link]');
    if (!link) return;
    const params = new URLSearchParams({ subject: link.dataset.replySubject ?? '', body: draft.value });
    // mailto clients expect percent-encoded spaces rather than form-style '+'.
    link.href = `mailto:${link.dataset.replyEmail}?${params.toString().replace(/\+/g, '%20')}`;
  });
});
