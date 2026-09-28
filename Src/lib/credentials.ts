export const usernamePattern = /^[A-Za-z0-9_]{3,24}$/;

export const validPassword = (value: string) => value.length >= 8
  && /[a-z]/.test(value)
  && /[A-Z]/.test(value)
  && /\d/.test(value)
  && /[^A-Za-z0-9]/.test(value);
