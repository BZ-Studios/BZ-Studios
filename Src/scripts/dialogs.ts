let lockedPosition: { x: number; y: number } | null = null;
const syncPageLock = () => {
  const hasModal = Array.from(document.querySelectorAll<HTMLDialogElement>('[data-modal-dialog]')).some((dialog) => dialog.open);
  const root = document.documentElement;
  if (hasModal && !lockedPosition) {
    lockedPosition = { x: window.scrollX, y: window.scrollY };
    root.style.setProperty('--modal-scroll-top', `${-lockedPosition.y}px`);
    root.setAttribute('data-modal-open', '');
  } else if (!hasModal && lockedPosition) {
    const position = lockedPosition;
    lockedPosition = null;
    root.removeAttribute('data-modal-open');
    root.style.removeProperty('--modal-scroll-top');
    window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
  }
};

document.querySelectorAll<HTMLDialogElement>('[data-modal-dialog]').forEach((dialog) => {
  document.querySelectorAll<HTMLButtonElement>(`[data-modal-open="${dialog.id}"]`).forEach((button) => {
    button.addEventListener('click', () => {
      dialog.showModal();
      document.dispatchEvent(new Event('bz:form-controls-refresh'));
      syncPageLock();
    });
  });
  dialog.querySelectorAll<HTMLButtonElement>('[data-modal-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', syncPageLock);
  dialog.addEventListener('toggle', syncPageLock);
  dialog.addEventListener('cancel', () => queueMicrotask(syncPageLock));
});

syncPageLock();
