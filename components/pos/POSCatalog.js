'use client';

import * as React from 'react';
import {
  Box, Stack, TextField, InputAdornment, IconButton, Typography,
  Chip, Pagination, CircularProgress, Button, Tooltip, Card, CardContent, CardActionArea,
  DialogTitle, DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useI18n } from '@/components/i18n/useI18n';
import FullScreenDialog from '@/components/common/FullScreenDialog';

function useDebounced(value, delay = 400) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function POSCatalog({ onPickVariant, isReturnMode = false }) {
  const { t, formatNumber } = useI18n();
  const [query, setQuery] = React.useState('');
  const q = useDebounced(query);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [meta, setMeta] = React.useState({ total: 0, pages: 1 });
  const [selected, setSelected] = React.useState(null); // product for modal

  const fetchList = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
      const res = await fetch(`/api/pos/search?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed to load POS catalog');
      setItems(json.items || []);
      setMeta(json.meta || { total: 0, pages: 1 });
    } catch (e) {
      setError(e?.message || String(e));
      setItems([]);
      setMeta({ total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [q, page, limit]);

  React.useEffect(() => { fetchList(); }, [fetchList]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          id="pos-catalog-search"
          size="small"
          placeholder={t('posCatalog.searchPlaceholder')}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <IconButton onClick={fetchList} title={t('common.refresh')}><RefreshIcon /></IconButton>
      </Stack>

      <Box
        sx={{
          position: 'relative',
          borderRadius: 2,
          // Reserve space for sticky bottom actions bar on mobile so last cards are not obscured
          pb: { xs: '96px', sm: 2 },
        }}
      >
        {loading && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        )}

        {!loading && error && (
          <Typography color="error" sx={{ p: 2 }}>{error}</Typography>
        )}

        {!loading && !error && items.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 2 }}>{t('products.none')}</Typography>
        )}

        {!loading && !error && items.length > 0 && (
          <Box sx={{
            display: 'grid',
            gap: 2,
            minWidth: 0,
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
              xl: 'repeat(5, 1fr)',
            },
          }}>
            {items.map((p) => (
              <Card key={p._id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <CardActionArea onClick={() => setSelected(p)} sx={{ alignItems: 'stretch' }}>
                  <Box sx={{ width: '100%', height: 140, position: 'relative', bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    {p.image?.url ? (
                      <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${p.image.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                    ) : (
                      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>{t('products.noImage')}</Box>
                    )}
                  </Box>
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" fontWeight={700}>{p.code}</Typography>
                      <Typography variant="body2" color="text.secondary">{p.name || '-'}</Typography>
                      <Chip size="small" label={`${formatNumber(p.variants?.length || 0)} ${t('products.variants')}`} sx={{ alignSelf: 'flex-start' }} />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      <Stack direction="row" justifyContent="flex-end" alignItems="center">
        <Pagination
          page={page}
          count={meta.pages || 1}
          onChange={(_e, p) => setPage(p)}
          color="primary"
          shape="rounded"
          showFirstButton
          showLastButton
        />
      </Stack>
      {/* Variant picker dialog */}
      <FullScreenDialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>{t('posCatalog.pickVariant')}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Box sx={{ width: 96, height: 96, position: 'relative', bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', overflow: 'hidden', borderRadius: 1 }}>
                  {selected.image?.url ? (
                    <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${selected.image.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                  ) : (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>{t('products.noImage')}</Box>
                  )}
                </Box>
                <Stack>
                  <Typography variant="subtitle1" fontWeight={700}>{selected.code}</Typography>
                  <Typography variant="body2" color="text.secondary">{selected.name || '-'}</Typography>
                  <Chip size="small" label={`${formatNumber(selected.variants?.length || 0)} ${t('products.variants')}`} sx={{ alignSelf: 'flex-start' }} />
                </Stack>
              </Stack>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('products.company')}</TableCell>
                    <TableCell>{t('products.size')}</TableCell>
                    <TableCell>{t('products.color')}</TableCell>
                    <TableCell align="right">{t('pos.onHand')}</TableCell>
                    <TableCell align="right">{t('common.action')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selected.variants || []).map((v) => {
                    const out = Number(v.qty || 0) <= 0;
                    return (
                      <TableRow key={v._id} hover>
                        <TableCell>{v.company?.name || '-'}</TableCell>
                        <TableCell>{v.size}</TableCell>
                        <TableCell>{v.color}</TableCell>
                        <TableCell align="right"><Chip size="small" color={out ? 'error' : 'success'} label={formatNumber(v.qty)} /></TableCell>
                        <TableCell align="right">
                          <Tooltip title={out ? t('posCatalog.outOfStockAllowed') : t('posCatalog.addToCart')}>
                            <span>
                              <Button
                                size="small"
                                variant="contained"
                                color={out ? 'warning' : 'primary'}
                                onClick={() => { if (onPickVariant) onPickVariant(v, selected); setSelected(null); }}
                              >
                                {t('common.add')}
                              </Button>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>{t('common.close')}</Button>
        </DialogActions>
      </FullScreenDialog>
    </Stack>
  );
}


