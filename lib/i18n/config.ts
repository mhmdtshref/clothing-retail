export const DEFAULT_LOCALE = 'en';
export const RTL_LOCALES = new Set<string>(['ar', 'he', 'fa', 'ur']);

export function isRtl(locale: string | undefined | null): boolean {
  if (!locale) return false;
  const base = String(locale).split('-')[0].toLowerCase();
  return RTL_LOCALES.has(base);
}

export function normalizeLocale(input?: string | null): string {
  if (!input) return DEFAULT_LOCALE;
  const base = String(input).trim();
  return base || DEFAULT_LOCALE;
}

export type Messages = Record<string, string>;
