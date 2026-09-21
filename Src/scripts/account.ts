import { getSupabaseBrowserClient } from '../lib/supabase-browser';

const passwordIsValid = (value: string) => value.length >= 8
  && /[a-z]/.test(value)
  && /[A-Z]/.test(value)
  && /\d/.test(value)
  && /[^A-Za-z0-9]/.test(value);

function updateFieldState(input: HTMLInputElement, feedback: HTMLElement | null, message = '') {
  input.classList.toggle('is-invalid', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
  input.setCustomValidity(message);
  if (feedback) {
    feedback.textContent = message;
    feedback.classList.toggle('is-error', Boolean(message));
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-password-toggle]').forEach((button) => {
  const input = document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLInputElement | null;
  button.addEventListener('click', () => {
    if (!input) return;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.setAttribute('aria-pressed', String(!visible));
    button.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    input.focus();
  });
});

document.querySelectorAll<HTMLDialogElement>('[data-legal-dialog]').forEach((dialog) => {
  document.querySelectorAll<HTMLButtonElement>(`[data-legal-open="${dialog.id}"]`).forEach((button) => {
    button.addEventListener('click', () => dialog.showModal());
  });
  dialog.querySelectorAll<HTMLButtonElement>('[data-legal-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

const registrationForm = document.querySelector<HTMLFormElement>('[data-registration-form]');
const username = registrationForm?.querySelector<HTMLInputElement>('[data-username]');
const usernameFeedback = registrationForm?.querySelector<HTMLElement>('[data-username-feedback]') ?? null;
let usernameTimer: ReturnType<typeof setTimeout> | undefined;
let usernameRequest = 0;

async function checkUsername() {
  if (!username) return;
  const value = username.value.trim();
  if (!/^[A-Za-z0-9_]{3,24}$/.test(value)) {
    const message = /\s/.test(value)
      ? 'El nombre de usuario no puede contener espacios.'
      : 'Usá entre 3 y 24 letras, números o guiones bajos.';
    updateFieldState(username, usernameFeedback, message);
    return;
  }

  updateFieldState(username, usernameFeedback);
  if (usernameFeedback) {
    usernameFeedback.textContent = 'Comprobando disponibilidad…';
    usernameFeedback.classList.remove('is-error', 'is-success');
  }
  const request = ++usernameRequest;
  try {
    const { data, error } = await getSupabaseBrowserClient().rpc('username_available', { candidate: value });
    if (request !== usernameRequest || username.value.trim() !== value) return;
    const available = !error && data === true;
    updateFieldState(username, usernameFeedback, available ? '' : 'Ese nombre de usuario ya está en uso.');
    usernameFeedback?.classList.toggle('is-success', available);
    if (available && usernameFeedback) usernameFeedback.textContent = 'Nombre disponible.';
  } catch {
    if (request === usernameRequest && usernameFeedback) usernameFeedback.textContent = 'La disponibilidad se verificará al crear la cuenta.';
  }
}

username?.addEventListener('input', () => {
  clearTimeout(usernameTimer);
  const value = username.value.trim();
  if (/\s/.test(username.value)) {
    updateFieldState(username, usernameFeedback, 'El nombre de usuario no puede contener espacios.');
    return;
  }
  if (value.length < 3) {
    updateFieldState(username, usernameFeedback, value ? 'Ingresá al menos 3 caracteres.' : '');
    return;
  }
  updateFieldState(username, usernameFeedback);
  usernameTimer = setTimeout(checkUsername, 450);
});
username?.addEventListener('blur', checkUsername);

document.querySelectorAll<HTMLFormElement>('[data-password-form]').forEach((form) => {
  const password = form.querySelector<HTMLInputElement>('[data-password]');
  const confirmation = form.querySelector<HTMLInputElement>('[data-password-confirmation]');
  const passwordFeedback = form.querySelector<HTMLElement>('[data-password-feedback]');
  const confirmationFeedback = form.querySelector<HTMLElement>('[data-confirmation-feedback]');

  const validatePassword = () => {
    if (!password) return true;
    const valid = passwordIsValid(password.value);
    updateFieldState(password, passwordFeedback, valid || !password.value ? '' : 'Usá 8 caracteres como mínimo, mayúscula, minúscula, número y símbolo.');
    return valid;
  };
  const validateConfirmation = () => {
    if (!confirmation || !password) return true;
    const valid = confirmation.value === password.value;
    updateFieldState(confirmation, confirmationFeedback, valid || !confirmation.value ? '' : 'Las contraseñas no coinciden.');
    return valid;
  };

  password?.addEventListener('input', () => {
    validatePassword();
    if (confirmation?.value) validateConfirmation();
  });
  confirmation?.addEventListener('input', validateConfirmation);
  form.addEventListener('submit', (event) => {
    form.classList.add('was-validated');
    const passwordValid = validatePassword();
    const confirmationValid = validateConfirmation();
    if (!passwordValid || !confirmationValid || !form.checkValidity()) {
      event.preventDefault();
      form.querySelector<HTMLInputElement>(':invalid')?.focus();
    }
  });
});
