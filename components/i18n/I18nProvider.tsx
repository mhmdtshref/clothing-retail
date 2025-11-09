'use client';

import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import { DEFAULT_LOCALE, isRtl, normalizeLocale, type Messages } from '@/lib/i18n/config';
import enCommon from '@/locales/en/common.json';

type I18nContextType = {
  locale: string;
  dir: 'ltr' | 'rtl';
  t: (key: string) => string;
  setLocale?: (next: string) => void;
};

const I18nContext = React.createContext<I18nContextType>({
  locale: DEFAULT_LOCALE,
  dir: 'ltr',
  t: (k) => k,
});

function buildMessages(locale: string): Messages {
  // Extend here to support more locales later
  const l = normalizeLocale(locale);
  switch (l.split('-')[0]) {
    case 'en':
    default:
      return enCommon as unknown as Messages;
  }
}

function createEmotionCache(dir: 'ltr' | 'rtl') {
  const stylisPlugins = [prefixer];
  return createCache({ key: dir === 'rtl' ? 'mui-rtl' : 'mui', stylisPlugins });
}

export function I18nProvider({ locale: initialLocale, children }: { locale?: string; children: React.ReactNode }) {
  const [locale, setLocale] = React.useState<string>(normalizeLocale(initialLocale));
  const dir: 'ltr' | 'rtl' = isRtl(locale) ? 'rtl' : 'ltr';
  const cache = React.useMemo(() => createEmotionCache(dir), [dir]);
  const theme = React.useMemo(() => createTheme({ direction: dir }), [dir]);
  const messages = React.useMemo(() => buildMessages(locale), [locale]);

  const t = React.useCallback(
    (key: string) => {
      if (!key) return '';
      return messages[key] ?? key;
    },
    [messages],
  );

  const ctx: I18nContextType = React.useMemo(() => ({ locale, dir, t, setLocale }), [locale, dir, t]);

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', locale);
    }
  }, [dir, locale]);

  return (
    <I18nContext.Provider value={ctx}>
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </CacheProvider>
    </I18nContext.Provider>
  );
}

export function useI18nInternal() {
  return React.useContext(I18nContext);
}


