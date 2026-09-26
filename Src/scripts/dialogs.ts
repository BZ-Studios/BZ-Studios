const syncPageLock = () => {
  const hasModal = Array.from(document.querySelectorAll<HTMLDialogElement>('[data-modal-dialog]')).some((dialog) => dialog.open);
  document.documentElement.toggleAttribute('data-modal-open', hasModal);
};

document.querySelectorAll<HTMLDialogElement>('[data-modal-dialog]').forEach((dialog) => {
  document.querySelectorAll<HTMLButtonElement>(`[data-modal-open="${dialog.id}"]`).forEach((button) => {
    button.addEventListener('click', () => {
      dialog.showModal();
      syncPageLock();
    });
  });
  dialog.querySelectorAll<HTMLButtonElement>('[data-modal-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', syncPageLock);
  dialog.addEventListener('cancel', () => queueMicrotask(syncPageLock));
});

syncPageLock();
