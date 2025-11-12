'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Paper,
  Toolbar,
  TextField,
  InputAdornment,
  IconButton,
  Stack,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  CircularProgress,
  Box,
  Pagination,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import SortIcon from '@mui/icons-material/Sort';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import { useI18n } from '@/components/i18n/useI18n';

const DEFAULTS = {
  query: '',
  status: 'active',
  sort: 'createdAt',
  order: 'desc',
  page: 1,
  limit: 20,
};

function useQueryState() {
  const router = useRouter();
  const sp = useSearchParams();

  const state = {
    query: sp.get('query') ?? DEFAULTS.query,
    status: sp.get('status') ?? DEFAULTS.status,
    sort: sp.get('sort') ?? DEFAULTS.sort,
    order: sp.get('order') ?? DEFAULTS.order,
    page: Number(sp.get('page') ?? DEFAULTS.page),
    limit: Number(sp.get('limit') ?? DEFAULTS.limit),
  };

  const set = (patch) => {
    const next = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    const qs = new URLSearchParams();
    if (next.query) qs.set('query', next.query);
    if (next.status) qs.set('status', next.status);
    if (next.sort) qs.set('sort', next.sort);
    if (next.order) qs.set('order', next.order);
    qs.set('page', String(next.page));
    qs.set('limit', String(next.limit));
    router.push(`/products?${qs.toString()}`);
  };

  return [state, set];
}

export default function ProductsListPage() {
  const { t, formatDate, formatNumber } = useI18n();
  const [state, setState] = useQueryState();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [data, setData] = React.useState({ items: [], meta: { total: 0, pages: 1 } });

  const [queryInput, setQueryInput] = React.useState(state.query);
  React.useEffect(() => {
    setQueryInput(state.query);
  }, [state.query]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (queryInput !== state.query) {
        setState((s) => ({ ...s, query: queryInput, page: 1 }));
      }
    }, 500);
    return () => clearTimeout(t);
  }, [queryInput, state.query, setState]);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        query: state.query,
        status: state.status,
        sort: state.sort,
        order: state.order,
        page: String(state.page),
        limit: String(state.limit),
        includeVariantCounts: 'true',
      });
      const res = await fetch(`/api/products?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed to load products');
      setData({ items: json.items || [], meta: json.meta || { total: 0, pages: 1 } });
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [state.query, state.status, state.sort, state.order, state.page, state.limit]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const switchOrder = () =>
    setState((s) => ({ ...s, order: s.order === 'asc' ? 'desc' : 'asc', page: 1 }));
  const onLimitChange = (e) => setState((s) => ({ ...s, limit: Number(e.target.value), page: 1 }));
  const onStatusChange = (e) => setState((s) => ({ ...s, status: e.target.value, page: 1 }));
  const onSortChange = (e) => setState((s) => ({ ...s, sort: e.target.value, page: 1 }));
  const onPageChange = (_evt, p) => setState((s) => ({ ...s, page: p }));

  return (
    <Paper sx={{ p: 2 }}>
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder={t('products.searchPlaceholder')}
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 260 }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="status-label">{t('common.status')}</InputLabel>
          <Select
            labelId="status-label"
            label={t('common.status')}
            value={state.status}
            onChange={onStatusChange}
          >
            <MenuItem value="active">{t('status.active')}</MenuItem>
            <MenuItem value="archived">{t('status.archived')}</MenuItem>
            <MenuItem value="all">{t('common.all')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="sort-label">{t('common.sortBy')}</InputLabel>
          <Select
            labelId="sort-label"
            label={t('common.sortBy')}
            value={state.sort}
            onChange={onSortChange}
            startAdornment={
              <InputAdornment position="start">
                <SortIcon fontSize="small" />
              </InputAdornment>
            }
          >
            <MenuItem value="createdAt">{t('products.createdAt')}</MenuItem>
            <MenuItem value="code">{t('products.code')}</MenuItem>
            <MenuItem value="name">{t('common.name')}</MenuItem>
          </Select>
        </FormControl>

        <IconButton size="small" onClick={switchOrder} aria-label="toggle order">
          {state.order === 'asc' ? (
            <ArrowUpwardIcon fontSize="small" />
          ) : (
            <ArrowDownwardIcon fontSize="small" />
          )}
        </IconButton>

        <FormControl size="small" sx={{ minWidth: 120, ml: 'auto' }}>
          <InputLabel id="limit-label">{t('common.perPage')}</InputLabel>
          <Select
            labelId="limit-label"
            label={t('common.perPage')}
            value={state.limit}
            onChange={onLimitChange}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </FormControl>

        <Button component={Link} href="/products/new" startIcon={<AddIcon />} variant="contained">
          {t('products.new')}
        </Button>

        <IconButton onClick={fetchList} title={t('common.refresh')}>
          <RefreshIcon />
        </IconButton>
      </Toolbar>

      <Box sx={{ position: 'relative', minHeight: 120 }}>
        {loading && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        )}

        {!loading && error && (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        )}

        {!loading && !error && (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('products.code')}</TableCell>
                  <TableCell>{t('common.name')}</TableCell>
                  <TableCell align="right">{t('products.basePrice')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell align="right">{t('products.variants')}</TableCell>
                  <TableCell>{t('products.created')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        {t('products.none')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {data.items.map((p) => (
                  <TableRow key={p._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{p.code}</Typography>
                    </TableCell>
                    <TableCell>{p.name || '-'}</TableCell>
                    <TableCell align="right">{formatNumber(Number(p.basePrice || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell align="right">{formatNumber(p.variantCount ?? 0)}</TableCell>
                    <TableCell>{formatDate(p.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ px: 2, py: 2 }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('common.total')}: {formatNumber(data.meta.total)} • {t('common.page')} {state.page} {t('common.of')} {formatNumber(data.meta.pages)}
              </Typography>
              <Pagination
                page={state.page}
                count={data.meta.pages || 1}
                onChange={onPageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
              />
            </Stack>
          </>
        )}
      </Box>
    </Paper>
  );
}
