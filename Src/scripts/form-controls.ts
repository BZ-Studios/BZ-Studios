// Keep real selects for native form submission and validation; enhance their UI.
const selectRefreshers: Array<() => void> = [];
let closeActiveSelect: (() => void) | undefined;

document.querySelectorAll<HTMLSelectElement>('select:not([multiple])').forEach((select, index) => {
  if (select.size > 1) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'bz-select';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'bz-select__trigger';
  trigger.id = `${select.id || `select-${index}`}-trigger`;
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const value = document.createElement('span');
  const arrow = document.createElement('span');
  arrow.className = 'bz-select__arrow';
  arrow.textContent = '⌄';
  arrow.setAttribute('aria-hidden', 'true');
  trigger.append(value, arrow);
  const list = document.createElement('div');
  list.id = `${trigger.id}-options`;
  list.className = 'bz-select__options';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  const supportsPopover = 'showPopover' in list;
  if (supportsPopover) list.setAttribute('popover', 'manual');
  trigger.setAttribute('aria-controls', list.id);
  const label = select.getAttribute('aria-label') || Array.from(select.labels ?? []).map(item => item.textContent?.trim()).join(' ') || select.name || 'Elegir una opción';
  trigger.setAttribute('aria-label', label);
  list.setAttribute('aria-label', label);
  if (select.getAttribute('aria-describedby')) trigger.setAttribute('aria-describedby', select.getAttribute('aria-describedby')!);
  const labels = Array.from(select.labels ?? []);
  select.before(wrapper);
  wrapper.append(select, trigger, list);
  select.classList.add('bz-select__native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  let activeIndex = select.selectedIndex;
  let options: HTMLElement[] = [];
  let typeBuffer = '';
  let lastTypedAt = 0;
  const isOpen = () => !list.hidden;
  const positionList = () => {
    if (!isOpen()) return;
    const rect = trigger.getBoundingClientRect();
    const height = Math.min(320, list.scrollHeight, window.innerHeight - 24);
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const useAbove = below < Math.min(height, 160) && above > below;
    const available = Math.max(44, useAbove ? above - 6 : below - 6);
    list.style.width = `${Math.min(rect.width, window.innerWidth - 16)}px`;
    list.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`;
    list.style.maxHeight = `${Math.min(320, available)}px`;
    list.style.top = `${useAbove ? Math.max(8, rect.top - Math.min(height, available) - 6) : rect.bottom + 6}px`;
  };
  const activate = (index: number) => {
    activeIndex = index;
    options.forEach((option, optionIndex) => option.classList.toggle('is-active', optionIndex === index));
    if (options[index]) {
      trigger.setAttribute('aria-activedescendant', options[index].id);
      options[index].scrollIntoView({ block: 'nearest' });
    }
  };
  const sync = () => {
    value.textContent = select.selectedOptions[0]?.textContent ?? 'Elegí una opción';
    trigger.disabled = select.disabled;
    trigger.setAttribute('aria-required', String(select.required));
    if (select.validity.valid) trigger.removeAttribute('aria-invalid');
    options.forEach((option, optionIndex) => option.setAttribute('aria-selected', String(optionIndex === select.selectedIndex)));
  };
  const close = () => {
    if (supportsPopover && list.matches(':popover-open')) list.hidePopover();
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    if (closeActiveSelect === close) closeActiveSelect = undefined;
  };
  const choose = (index: number) => {
    if (!select.options[index] || select.options[index].disabled) return;
    select.selectedIndex = index;
    sync();
    close();
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    trigger.focus();
  };
  const buildOptions = () => {
    list.replaceChildren();
    options = Array.from(select.options).map((nativeOption, optionIndex) => {
      const option = document.createElement('div');
      option.className = 'bz-select__option';
      option.id = `${list.id}-${optionIndex}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-disabled', String(nativeOption.disabled));
      option.textContent = nativeOption.text;
      option.addEventListener('pointerdown', event => event.preventDefault());
      option.addEventListener('click', () => choose(optionIndex));
      list.append(option);
      return option;
    });
    sync();
  };
  const open = () => {
    if (select.disabled) return;
    closeActiveSelect?.();
    closeActiveSelect = close;
    sync();
    list.hidden = false;
    if (supportsPopover) list.showPopover();
    trigger.setAttribute('aria-expanded', 'true');
    positionList();
    activate(Math.max(0, select.selectedIndex));
  };
  trigger.addEventListener('click', () => isOpen() ? close() : open());
  trigger.addEventListener('keydown', event => {
    const enabled = Array.from(select.options).map((option, optionIndex) => option.disabled ? -1 : optionIndex).filter(index => index !== -1);
    if (event.key === 'Escape') { if (isOpen()) { event.preventDefault(); event.stopPropagation(); close(); } return; }
    if (event.key === 'Tab') { if (isOpen()) choose(activeIndex); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (isOpen()) choose(activeIndex); else open(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const wasOpen = isOpen();
      if (!wasOpen) open();
      const position = enabled.indexOf(activeIndex);
      const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1)
        : wasOpen ? enabled[Math.max(0, Math.min(enabled.length - 1, position + (event.key === 'ArrowDown' ? 1 : -1)))] : activeIndex;
      if (next !== undefined) activate(next);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      typeBuffer = now - lastTypedAt > 700 ? event.key : typeBuffer + event.key;
      lastTypedAt = now;
      if (!isOpen()) open();
      const index = enabled.find(index => select.options[index].text.toLocaleLowerCase('es').startsWith(typeBuffer.toLocaleLowerCase('es')));
      if (index !== undefined) activate(index);
    }
  });
  labels.forEach(label => label.addEventListener('click', event => {
    if (event.target !== select) { event.preventDefault(); trigger.focus(); }
  }));
  document.addEventListener('pointerdown', event => { if (event.target instanceof Node && !wrapper.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (event.target instanceof Node && !wrapper.contains(event.target)) close(); });
  window.addEventListener('resize', positionList);
  document.addEventListener('scroll', positionList, true);
  select.addEventListener('change', sync);
  select.addEventListener('invalid', event => { event.preventDefault(); trigger.setAttribute('aria-invalid', 'true'); trigger.focus(); });
  new MutationObserver(buildOptions).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'required', 'label'] });
  selectRefreshers.push(sync);
  buildOptions();
});

const resizeTextarea = (textarea: HTMLTextAreaElement) => {
  if (!textarea.getClientRects().length) return;
  textarea.setAttribute('data-autosize', '');
  textarea.style.height = 'auto';
  const border = textarea.offsetHeight - textarea.clientHeight;
  textarea.style.height = `${textarea.scrollHeight + border}px`;
};
const refresh = () => {
  selectRefreshers.forEach(sync => sync());
  document.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(resizeTextarea);
};
document.addEventListener('input', event => { if (event.target instanceof HTMLTextAreaElement) resizeTextarea(event.target); });
document.addEventListener('change', event => { if (event.target instanceof HTMLTextAreaElement) resizeTextarea(event.target); });
document.addEventListener('reset', () => requestAnimationFrame(refresh));
document.addEventListener('bz:form-controls-refresh', () => requestAnimationFrame(refresh));
document.querySelectorAll('dialog, details').forEach(element => element.addEventListener('toggle', () => requestAnimationFrame(refresh)));
window.addEventListener('resize', refresh);
window.addEventListener('pageshow', refresh);
refresh();
