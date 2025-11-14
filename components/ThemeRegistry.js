'use client';

import * as React from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { ThemeProvider, CssBaseline } from '@mui/material';
import createAppTheme from '@/theme';
import { useI18nInternal } from '@/components/i18n/I18nProvider';

export default function ThemeRegistry({ children }) {
  const { dir } = useI18nInternal?.() || { dir: 'ltr' };
  const { cache, flush } = React.useMemo(() => {
    const cache = createCache({
      key: dir === 'rtl' ? 'mui-rtl' : 'mui',
      prepend: true,
      stylisPlugins: dir === 'rtl' ? [prefixer, rtlPlugin] : [prefixer],
    });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (!cache.inserted[serialized.name]) inserted.push(serialized.name);
      return prevInsert(...args);
    };
    const flush = () => {
      const prev = inserted;
      inserted = [];
      return prev;
    };
    return { cache, flush };
  }, [dir]);
  const muiTheme = React.useMemo(() => createAppTheme(dir), [dir]);

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    const css = names.map((name) => cache.inserted[name]).join('');
    return (
      <style
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: css }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
