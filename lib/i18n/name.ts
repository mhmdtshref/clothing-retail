import { normalizeLocale } from '@/lib/i18n/config';

export type LocalizedName = { en?: string; ar?: string } | null | undefined;

export function pickLocalizedName(name: LocalizedName, locale?: string | null): string {
  const l = normalizeLocale(locale);
  const base = String(l).split('-')[0].toLowerCase();
  const en = String(name?.en || '').trim();
  const ar = String(name?.ar || '').trim();
  if (base === 'ar') return ar || en || '';
  return en || ar || '';
}

