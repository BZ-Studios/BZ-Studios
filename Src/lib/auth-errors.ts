type AuthFailure = {
  code?: string;
  message?: string;
  status?: number;
};

const normalizeFailure = (error: unknown) => {
  if (!error || typeof error !== 'object') return { code: '', message: '', status: 0 };
  const value = error as AuthFailure;
  return {
    code: typeof value.code === 'string' ? value.code : '',
    message: typeof value.message === 'string' ? value.message : '',
    status: typeof value.status === 'number' ? value.status : 0,
  };
};

export function describeAuthFailure(error: unknown, fallback: string) {
  const { code, message, status } = normalizeFailure(error);
  const searchable = `${code} ${message}`.toLowerCase();

  if (/new password should be different|same password|password.*different/.test(searchable)) {
    return 'La nueva contraseña debe ser diferente de la contraseña actual.';
  }
  if (status === 429 || /rate.?limit|too many|over_email_send_rate_limit/.test(searchable)) {
    return 'Alcanzaste temporalmente el límite de intentos. Esperá unos minutos antes de volver a probar.';
  }
  if (/535|username and password not accepted|smtp|sending confirmation|confirmation email/.test(searchable)) {
    return 'No pudimos enviar el correo. El servidor de correo rechazó el envío; intentá nuevamente más tarde.';
  }
  if (/user_already_exists|already registered|already exists/.test(searchable)) {
    return 'Ya existe una cuenta con ese correo. Probá iniciar sesión o recuperar la contraseña.';
  }
  if (/email_address_invalid|invalid email/.test(searchable)) {
    return 'El correo electrónico no es válido. Revisalo e intentá nuevamente.';
  }
  if (/signup_disabled|signups? (?:are )?disabled/.test(searchable)) {
    return 'La creación de cuentas está deshabilitada temporalmente.';
  }
  if (/weak_password/.test(searchable) || (/password/.test(searchable) && status === 422)) {
    return 'La contraseña fue rechazada. Usá 8 caracteres como mínimo, con mayúscula, minúscula, número y símbolo.';
  }
  if (/invalid login credentials|invalid_credentials/.test(searchable)) {
    return 'El correo o la contraseña no son correctos.';
  }
  if (/email not confirmed|email_not_confirmed/.test(searchable)) {
    return 'Primero tenés que verificar tu correo electrónico.';
  }
  if (/otp_expired|token.*expired|token.*invalid|invalid.*token/.test(searchable)) {
    return 'El código no es válido o ya venció. Solicitá uno nuevo.';
  }
  if (/session.*missing|auth session missing/.test(searchable)) {
    return 'La sesión de seguridad venció. Solicitá un código nuevo.';
  }
  return fallback;
}

export const describeSignupFailure = (error: unknown) => describeAuthFailure(
  error,
  'No pudimos crear la cuenta. Revisá los datos e intentá nuevamente.',
);
