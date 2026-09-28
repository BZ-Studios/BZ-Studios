type AuthFailure = {
  code?: string;
  message?: string;
  status?: number;
};

type RegistrationStage = 'username-check' | 'signup';

const normalizeFailure = (error: unknown): Required<AuthFailure> => {
  if (!error || typeof error !== 'object') return { code: 'unknown', message: 'Unknown authentication error', status: 0 };
  const value = error as AuthFailure;
  return {
    code: typeof value.code === 'string' ? value.code : 'unknown',
    message: typeof value.message === 'string' ? value.message : 'Unknown authentication error',
    status: typeof value.status === 'number' ? value.status : 0,
  };
};

const safeLogMessage = (message: string) => message
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo oculto]')
  .slice(0, 500);

export function describeSignupFailure(error: unknown) {
  const { code, message, status } = normalizeFailure(error);
  const searchable = `${code} ${message}`.toLowerCase();

  if (status === 429 || /rate.?limit|too many|over_email_send_rate_limit/.test(searchable)) {
    return 'Se alcanzó temporalmente el límite de intentos o correos. Esperá unos minutos antes de volver a probar.';
  }
  if (/535|username and password not accepted|smtp|sending confirmation|confirmation email/.test(searchable)) {
    return 'No pudimos enviar el correo de confirmación. El servidor de correo rechazó el envío; revisá la configuración SMTP o intentá nuevamente más tarde.';
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
  if (/weak_password|password/.test(searchable) && status === 422) {
    return 'La contraseña fue rechazada por el servicio de cuentas. Comprobá que cumpla todos los requisitos.';
  }
  if (status >= 500) {
    return 'El servicio de cuentas tuvo un problema interno. No se completó el registro; intentá nuevamente más tarde.';
  }
  return 'No pudimos crear la cuenta. Revisá los datos e intentá nuevamente.';
}

export function reportRegistrationFailure(stage: RegistrationStage, error: unknown) {
  const failure = normalizeFailure(error);
  const diagnosticId = `REG-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  // Deliberately exclude email, username, password, cookies and tokens. This object
  // is safe to locate in Vercel logs using the diagnostic ID shown to the user.
  console.error('[B&Z registration failure]', {
    diagnosticId,
    stage,
    status: failure.status || undefined,
    code: failure.code,
    message: safeLogMessage(failure.message),
  });

  return diagnosticId;
}
