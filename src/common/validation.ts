export type FieldErrors = Record<string, string | undefined>;

export const rules = {
  required: (val: string, label: string): string =>
    !val || !val.trim() ? `${label} is required.` : "",

  email: (val: string): string =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? "" : "Enter a valid email address.",

  phone: (val: string): string =>
    /^\d{6,15}$/.test(val.replace(/\s/g, "")) ? "" : "Enter a valid phone number (digits only).",

  password: (val: string): string =>
    /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/.test(val)
      ? ""
      : "Min 6 chars, 1 uppercase, 1 number, 1 symbol.",

  confirmPassword: (val: string, original: string): string =>
    val === original ? "" : "Passwords do not match.",

  maxLen: (val: string, max: number, label: string): string =>
    val.length <= max ? "" : `${label} must be at most ${max} characters.`,
};

export function collectErrors(
  checks: Record<string, string | undefined>
): FieldErrors {
  const errors: FieldErrors = {};
  for (const [key, msg] of Object.entries(checks)) {
    if (msg) errors[key] = msg;
  }
  return errors;
}
