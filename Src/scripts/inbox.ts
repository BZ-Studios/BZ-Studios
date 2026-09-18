const inboxSearch = document.querySelector<HTMLInputElement>('[data-inbox-search]');
const inboxFilter = document.querySelector<HTMLSelectElement>('[data-inbox-filter]');
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export function refreshInbox() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-message-card]'));
  const search = normalizeSearch(inboxSearch?.value.trim() ?? '');
  const filter = inboxFilter?.value ?? 'all';
  let visible = 0;
  cards.forEach((card) => {
    const matchesState = filter === 'all' || (filter === 'read' ? card.dataset.read === 'true' : card.dataset.read !== 'true');
    card.hidden = !matchesState || !normalizeSearch(card.dataset.search ?? '').includes(search);
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
