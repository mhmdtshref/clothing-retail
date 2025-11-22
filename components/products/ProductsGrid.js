'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Pagination, TextField, InputAdornment, IconButton, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { useI18n } from '@/components/i18n/useI18n';

function useDebounced(value, delay = 400) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

export default function ProductsGrid({ initialQuery = '', initialPage = 1, initialLimit = 20, initialView = 'grid' }) {
  const { t } = useI18n();
  const THUMB_HEIGHT = 180; // uniform thumbnail height for all cards
  const [query, setQuery] = React.useState(initialQuery);
  const [page, setPage] = React.useState(initialPage);
  const [limit, setLimit] = React.useState(initialLimit);
  const [view, setView] = React.useState(initialView);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [meta, setMeta] = React.useState({ total: 0, pages: 1 });
  const q = useDebounced(query);

  const fetchList = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams({ query: q, page: String(page), limit: String(limit) });
      const res = await fetch(`/api/products?${qs.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed to load products');
      setItems(json.items || []);
      setMeta(json.meta || { total: 0, pages: 1 });
    } catch (e) {
      setError(e?.message || String(e));
      setItems([]); setMeta({ total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [q, page, limit]);

  React.useEffect(() => { fetchList(); }, [fetchList]);

  // (No external placeholder needed; we render a uniform container per card below)

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          placeholder={t('products.searchPlaceholder')}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
          sx={{ minWidth: 260, flex: 1 }}
        />
        <ToggleButtonGroup exclusive size="small" value={view} onChange={(_e, v) => v && setView(v)}>
          <ToggleButton value="grid"><ViewModuleIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="list"><TableRowsIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
        <IconButton onClick={fetchList} title={t('common.refresh')}><RefreshIcon /></IconButton>
      </Stack>

      {error && <Typography color="error">{error}</Typography>}

      {view === 'grid' && (
        <Box sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',   // phones
            sm: 'repeat(2, 1fr)',   // small tablets
            md: 'repeat(3, 1fr)',   // medium screens
            lg: 'repeat(4, 1fr)',   // large screens
            xl: 'repeat(5, 1fr)',   // extra large screens (target: 5 per row)
          },
        }}>
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <Card key={`sk-${i}`} variant="outlined" sx={{ p: 1 }}>
              <Box sx={{ width: '100%', height: THUMB_HEIGHT, bgcolor: 'background.default' }} />
              <CardContent>
                <Typography variant="subtitle2" sx={{ bgcolor: 'action.hover', height: 20, borderRadius: 1 }} />
              </CardContent>
            </Card>
          ))}
          {!loading && items.length === 0 && (
            <Typography color="text.secondary">{t('products.none')}</Typography>
          )}
          {!loading && items.map((p) => (
            <Link key={p._id} href={`/products/${p._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ width: '100%', height: THUMB_HEIGHT, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', overflow: 'hidden', position: 'relative' }}>
                  {p.image?.url ? (
                    <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${p.image.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                  ) : (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>{t('products.noImage')}</Box>
                  )}
                </Box>
                <CardContent sx={{ flex: 1 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle1" fontWeight={700}>{p.code}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.localCode || '\u00A0'}</Typography>
                    <Chip size="small" label={p.status} color={p.status === 'active' ? 'success' : (p.status === 'archived' ? 'default' : 'warning')} sx={{ alignSelf: 'flex-start' }} />
                  </Stack>
                </CardContent>
              </Card>
            </Link>
          ))}
        </Box>
      )}

      {view === 'list' && (
        <Stack spacing={1}>
          {loading && <Typography color="text.secondary">{t('common.loading')}</Typography>}
          {!loading && items.length === 0 && <Typography color="text.secondary">{t('products.none')}</Typography>}
          {!loading && items.map((p) => (
            <Link key={p._id} href={`/products/${p._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ width: 72, height: 72, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'background.default', flex: '0 0 auto', position: 'relative' }}>
                {p.image?.url ? (
                  <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${p.image.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                ) : (
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>No Image</Box>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700}>{p.code}</Typography>
                <Typography variant="body2" color="text.secondary">{p.localCode || '\u00A0'}</Typography>
              </Box>
              <Chip size="small" label={p.status} />
              </Stack>
            </Link>
          ))}
        </Stack>
      )}

      <Stack direction="row" justifyContent="flex-end">
        <Pagination page={page} count={meta.pages || 1} onChange={(_e, p) => setPage(p)} />
      </Stack>
    </Stack>
  );
}


