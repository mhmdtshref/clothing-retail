'use client';

import * as React from 'react';
import {
  Autocomplete,
  Box,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Chip,
  CircularProgress,
  Button,
  Tooltip,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
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

export default function POSCatalog({ onPickVariant, isReturnMode = false, compact = false }) {
  const { t, formatNumber } = useI18n();
  const [query, setQuery] = React.useState('');
  const q = useDebounced(query);
  const [limit] = React.useState(12);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [selected, setSelected] = React.useState(null); // product for modal
  const searchInputRef = React.useRef(null);
  const fetchSeq = React.useRef(0);

  const fetchList = React.useCallback(
    async (search) => {
      const trimmed = (search ?? '').trim();
      const seq = ++fetchSeq.current;
      if (trimmed.length < 1) {
        setLoading(false);
        setError('');
        setItems([]);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ q: trimmed, page: '1', limit: String(limit) });
        const res = await fetch(`/api/pos/search?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error('Failed to load POS catalog');
        if (seq !== fetchSeq.current) return; // stale response
        setItems(json.items || []);
      } catch (e) {
        if (seq !== fetchSeq.current) return; // stale response
        setError(e?.message || String(e));
        setItems([]);
      } finally {
        if (seq !== fetchSeq.current) return;
        setLoading(false);
      }
    },
    [limit],
  );

  React.useEffect(() => {
    fetchList(q);
  }, [fetchList, q]);

  return (
    <Stack spacing={compact ? 0 : 2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Autocomplete
          id="pos-catalog-search"
          open={open && query.trim().length >= 1}
          onOpen={() => {
            if (query.trim().length >= 1) setOpen(true);
          }}
          onClose={() => setOpen(false)}
          options={items}
          loading={loading}
          value={null}
          inputValue={query}
          size={compact ? 'small' : undefined}
          onInputChange={(_e, newValue, reason) => {
            const trimmed = (newValue ?? '').trim();
            if (reason === 'input') {
              setQuery(newValue);
              if (trimmed.length >= 1) {
                setOpen(true);
              } else {
                // Empty search should show no dropdown suggestions and do no fetch.
                setOpen(false);
                fetchSeq.current += 1; // invalidate any in-flight request
                setLoading(false);
                setError('');
                setItems([]);
              }
            }
            if (reason === 'clear') {
              setQuery('');
              setOpen(false);
              fetchSeq.current += 1; // invalidate any in-flight request
              setLoading(false);
              setError('');
              setItems([]);
            }
            // Ignore "reset" so selecting an option doesn't overwrite what the cashier typed.
          }}
          onChange={(_e, option) => {
            if (option) {
              setSelected(option);
              setOpen(false);
            }
          }}
          isOptionEqualToValue={(opt, val) => opt?._id === val?._id}
          filterOptions={(x) => x}
          noOptionsText={
            query.trim().length >= 1 ? t('products.none') : t('posCatalog.searchPlaceholder')
          }
          getOptionLabel={(option) => option?.code || ''}
          renderOption={(props, option) => (
            <Box component="li" {...props} key={option._id} sx={{ py: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ width: '100%', minWidth: 0 }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    flex: '0 0 auto',
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {option.image?.url ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${option.image.url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  ) : null}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {option.code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {option.localCode || '-'}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={`${formatNumber(option.variants?.length || 0)} ${t('products.variants')}`}
                />
              </Stack>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={searchInputRef}
              size="small"
              placeholder={t('posCatalog.searchPlaceholder')}
              error={Boolean(error)}
              helperText={error || ''}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
              sx={{ minWidth: 0 }}
            />
          )}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <IconButton
          onClick={() => {
            fetchList(query);
            setOpen(true);
          }}
          title={t('common.refresh')}
          disabled={query.trim().length < 1}
        >
          <RefreshIcon />
        </IconButton>
      </Stack>
      {/* Variant picker dialog */}
      <FullScreenDialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('posCatalog.pickVariant')}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 96,
                    height: 96,
                    position: 'relative',
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    borderRadius: 1,
                  }}
                >
                  {selected.image?.url ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${selected.image.url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      {t('products.noImage')}
                    </Box>
                  )}
                </Box>
                <Stack>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {selected.code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selected.localCode || '-'}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${formatNumber(selected.variants?.length || 0)} ${t('products.variants')}`}
                    sx={{ alignSelf: 'flex-start' }}
                  />
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
                        <TableCell align="right">
                          <Chip
                            size="small"
                            color={out ? 'error' : 'success'}
                            label={formatNumber(v.qty)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip
                            title={
                              out ? t('posCatalog.outOfStockAllowed') : t('posCatalog.addToCart')
                            }
                          >
                            <span>
                              <Button
                                size="small"
                                variant="contained"
                                color={out ? 'warning' : 'primary'}
                                onClick={() => {
                                  if (onPickVariant) onPickVariant(v, selected);
                                  setSelected(null);
                                  setQuery('');
                                  setOpen(false);
                                  fetchSeq.current += 1; // invalidate any in-flight request
                                  setLoading(false);
                                  setItems([]);
                                  setError('');
                                  // Re-focus search for quick scanning
                                  setTimeout(() => searchInputRef.current?.focus(), 50);
                                }}
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
