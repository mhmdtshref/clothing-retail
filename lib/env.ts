export function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  const v = String(value).trim().toLowerCase();
  if (!v) return defaultValue;
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return defaultValue;
}

export function getSignupEnabled(): boolean {
  // Default: allow sign-ups
  return parseEnvBoolean(process.env.SIGNUP_ENABLED, true);
}
