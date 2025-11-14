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
  Tooltip,
  Menu,
  ListItemIcon,
  Drawer,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import SortIcon from '@mui/icons-material/Sort';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import Link from 'next/link';
import FilterListIcon from '@mui/icons-material/FilterList';
import ResponsiveListItem from '@/components/common/ResponsiveListItem';

const DEFAULTS = {
  query: '',
  status: 'all',
  companyId: '',
  sort: 'date',
  order: 'desc',
  page: 1,
  limit: 20,
  dateFrom: '',
  dateTo: '',
};

export default function ReceiptsListPage({ companies }) {
  const router = useRouter();
  const sp = useSearchParams();

  const state = {
    query: sp.get('query') ?? DEFAULTS.query,
    status: sp.get('status') ?? DEFAULTS.status,
    companyId: sp.get('companyId') ?? DEFAULTS.companyId,
    sort: sp.get('sort') ?? DEFAULTS.sort,
    order: sp.get('order') ?? DEFAULTS.order,
    page: Number(sp.get('page') ?? DEFAULTS.page),
    limit: Number(sp.get('limit') ?? DEFAULTS.limit),
    dateFrom: sp.get('dateFrom') ?? DEFAULTS.dateFrom,
    dateTo: sp.get('dateTo') ?? DEFAULTS.dateTo,
  };

  const setState = (patch) => {
    const next = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    const qs = new URLSearchParams();
    if (next.query) qs.set('query', next.query);
    if (next.status) qs.set('status', next.status);
    if (next.companyId) qs.set('companyId', next.companyId);
    if (next.dateFrom) qs.set('dateFrom', next.dateFrom);
    if (next.dateTo) qs.set('dateTo', next.dateTo);
    qs.set('sort', next.sort);
    qs.set('order', next.order);
    qs.set('page', String(next.page));
    qs.set('limit', String(next.limit));
    router.push(`/receipts?${qs.toString()}`);
  };

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [data, setData] = React.useState({ items: [], meta: { total: 0, pages: 1 } });

  // query input debounce
  const [queryInput, setQueryInput] = React.useState(state.query);
  React.useEffect(() => setQueryInput(state.query), [state.query]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (queryInput !== state.query) setState({ query: queryInput, page: 1 });
    }, 400);
    return () => clearTimeout(t);
  }, [queryInput, state.query, setState]);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        query: state.query,
        status: state.status,
        companyId: state.companyId,
        sort: state.sort,
        order: state.order,
        page: String(state.page),
        limit: String(state.limit),
      });
      if (state.dateFrom) qs.set('dateFrom', state.dateFrom);
      if (state.dateTo) qs.set('dateTo', state.dateTo);
      const res = await fetch(`/api/receipts?${qs.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed to load receipts');
      setData({ items: json.items || [], meta: json.meta || { total: 0, pages: 1 } });
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [
    state.query,
    state.status,
    state.companyId,
    state.sort,
    state.order,
    state.page,
    state.limit,
    state.dateFrom,
    state.dateTo,
  ]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const switchOrder = () =>
    setState((s) => ({ ...s, order: s.order === 'asc' ? 'desc' : 'asc', page: 1 }));
  const onLimitChange = (e) => setState({ limit: Number(e.target.value), page: 1 });
  const onStatusChange = (e) => setState({ status: e.target.value, page: 1 });
  const onSortChange = (e) => setState({ sort: e.target.value, page: 1 });
  const onCompanyChange = (e) => setState({ companyId: e.target.value, page: 1 });
  const onDateFrom = (e) => setState({ dateFrom: e.target.value, page: 1 });
  const onDateTo = (e) => setState({ dateTo: e.target.value, page: 1 });
  const onPageChange = (_evt, p) => setState({ page: p });

  // Status menu state
  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const [menuRow, setMenuRow] = React.useState(null);
  const openMenu = Boolean(menuAnchor);

  const openStatusMenu = (evt, row) => {
    setMenuAnchor(evt.currentTarget);
    setMenuRow(row);
  };
  const closeStatusMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const setStatus = async (next) => {
    if (!menuRow) return;
    try {
      const res = await fetch(`/api/receipts/${menuRow._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to change status');
      closeStatusMenu();
      fetchList();
    } catch (e) {
      alert(e?.message || String(e));
    }
  };

  const [filtersOpen, setFiltersOpen] = React.useState(false);

  return (
    <Paper sx={{ p: 2 }}>
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search receipts (note, product code/name)"
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

        <IconButton sx={{ display: { xs: 'inline-flex', sm: 'none' } }} onClick={() => setFiltersOpen(true)} title="Filters">
          <FilterListIcon />
        </IconButton>

        <FormControl size="small" sx={{ minWidth: 140, display: { xs: 'none', sm: 'flex' } }}>
          <InputLabel id="status-label">Status</InputLabel>
          <Select
            labelId="status-label"
            label="Status"
            value={state.status}
            onChange={onStatusChange}
          >
            <MenuItem value="all">all</MenuItem>
            <MenuItem value="ordered">ordered</MenuItem>
            <MenuItem value="on_delivery">on_delivery</MenuItem>
            <MenuItem value="payment_collected">payment_collected</MenuItem>
            <MenuItem value="ready_to_receive">ready_to_receive</MenuItem>
            <MenuItem value="completed">completed</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180, display: { xs: 'none', sm: 'flex' } }}>
          <InputLabel id="company-label">Company</InputLabel>
          <Select
            labelId="company-label"
            label="Company"
            value={state.companyId}
            onChange={onCompanyChange}
          >
            <MenuItem value="">All companies</MenuItem>
            {companies.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="From"
          type="date"
          value={state.dateFrom}
          onChange={onDateFrom}
          InputLabelProps={{ shrink: true }}
          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
        />
        <TextField
          size="small"
          label="To"
          type="date"
          value={state.dateTo}
          onChange={onDateTo}
          InputLabelProps={{ shrink: true }}
          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
        />

        <FormControl size="small" sx={{ minWidth: 160, display: { xs: 'none', sm: 'flex' } }}>
          <InputLabel id="sort-label">Sort by</InputLabel>
          <Select
            labelId="sort-label"
            label="Sort by"
            value={state.sort}
            onChange={onSortChange}
            startAdornment={
              <InputAdornment position="start">
                <SortIcon fontSize="small" />
              </InputAdornment>
            }
          >
            <MenuItem value="date">date</MenuItem>
            <MenuItem value="createdAt">createdAt</MenuItem>
            <MenuItem value="status">status</MenuItem>
          </Select>
        </FormControl>

        <IconButton size="small" onClick={() => switchOrder()} aria-label="toggle order" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          {state.order === 'asc' ? (
            <ArrowUpwardIcon fontSize="small" />
          ) : (
            <ArrowDownwardIcon fontSize="small" />
          )}
        </IconButton>

        <FormControl size="small" sx={{ minWidth: 120, ml: 'auto', display: { xs: 'none', sm: 'flex' } }}>
          <InputLabel id="limit-label">Per page</InputLabel>
          <Select
            labelId="limit-label"
            label="Per page"
            value={state.limit}
            onChange={onLimitChange}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </FormControl>

        <Button component={Link} href="/receipts/new" startIcon={<AddIcon />} variant="contained" sx={{ ml: { xs: 'auto', sm: 0 } }}>
          New Purchase
        </Button>
        <IconButton onClick={fetchList} title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Toolbar>

      {/* Filters Drawer (mobile) */}
      <Drawer anchor="left" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <Box sx={{ width: 320, maxWidth: '90vw', p: 2 }} role="presentation">
          <Typography variant="h6" sx={{ mb: 1 }}>Filters</Typography>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel id="status-label-m">Status</InputLabel>
              <Select
                labelId="status-label-m"
                label="Status"
                value={state.status}
                onChange={onStatusChange}
              >
                <MenuItem value="all">all</MenuItem>
                <MenuItem value="ordered">ordered</MenuItem>
                <MenuItem value="on_delivery">on_delivery</MenuItem>
                <MenuItem value="payment_collected">payment_collected</MenuItem>
                <MenuItem value="ready_to_receive">ready_to_receive</MenuItem>
                <MenuItem value="completed">completed</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="company-label-m">Company</InputLabel>
              <Select
                labelId="company-label-m"
                label="Company"
                value={state.companyId}
                onChange={onCompanyChange}
              >
                <MenuItem value="">All companies</MenuItem>
                {companies.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField size="small" label="From" type="date" value={state.dateFrom} onChange={onDateFrom} InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="To" type="date" value={state.dateTo} onChange={onDateTo} InputLabelProps={{ shrink: true }} />

            <FormControl size="small" fullWidth>
              <InputLabel id="sort-label-m">Sort by</InputLabel>
              <Select
                labelId="sort-label-m"
                label="Sort by"
                value={state.sort}
                onChange={onSortChange}
                startAdornment={<InputAdornment position="start"><SortIcon fontSize="small" /></InputAdornment>}
              >
                <MenuItem value="date">date</MenuItem>
                <MenuItem value="createdAt">createdAt</MenuItem>
                <MenuItem value="status">status</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">Order</Typography>
              <IconButton size="small" onClick={() => switchOrder()} aria-label="toggle order">
                {state.order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
              </IconButton>
            </Stack>

            <FormControl size="small" fullWidth>
              <InputLabel id="limit-label-m">Per page</InputLabel>
              <Select
                labelId="limit-label-m"
                label="Per page"
                value={state.limit}
                onChange={onLimitChange}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="flex-end">
            <Button onClick={() => setFiltersOpen(false)}>Done</Button>
          </Stack>
        </Box>
      </Drawer>

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
            {/* Table on sm+ */}
            <Table size="small" sx={{ display: { xs: 'none', sm: 'table' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Items</TableCell>
                  <TableCell align="right">Grand Total</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        No receipts found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {data.items.map((r) => {
                  const disabledEdit = r.status === 'completed';
                  const disabledStatus = r.status === 'completed';

                  return (
                    <TableRow key={r._id} hover>
                      <TableCell>{new Date(r.date).toLocaleString()}</TableCell>
                      <TableCell>{r.company?.name || '-'}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell align="right">{r.itemCount}</TableCell>
                      <TableCell align="right">{Number(r.grandTotal || 0).toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={
                            disabledEdit
                              ? 'Completed receipts cannot be edited (Step 4 adds editor)'
                              : 'View / Edit (coming in Step 4)'
                          }
                        >
                          <span>
                            <Button size="small" startIcon={<EditIcon />} disabled>
                              {'View / Edit'}
                            </Button>
                          </span>
                        </Tooltip>

                        <Tooltip
                          title={
                            disabledStatus
                              ? 'Completed receipts cannot change status'
                              : 'Change Status'
                          }
                        >
                          <span>
                            <Button
                              size="small"
                              onClick={(e) => (!disabledStatus ? openStatusMenu(e, r) : null)}
                              disabled={disabledStatus}
                            >
                              Change Status
                            </Button>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Cards on xs */}
            <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
              {data.items.length === 0 && (
                <Typography color="text.secondary" sx={{ py: 2 }}>No receipts found.</Typography>
              )}
              {data.items.map((r) => {
                const disabledStatus = r.status === 'completed';
                const date = new Date(r.date).toLocaleString();
                const total = Number(r.grandTotal || 0).toFixed(2);
                return (
                  <ResponsiveListItem
                    key={r._id}
                    title={r.company?.name || '-'}
                    subtitle={`${r.status} • ${date}`}
                    metaEnd={`${total}`}
                    actions={(
                      <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                        <Button size="small" startIcon={<EditIcon />} disabled>
                          {'View / Edit'}
                        </Button>
                        <Button
                          size="small"
                          onClick={(e) => (!disabledStatus ? openStatusMenu(e, r) : null)}
                          disabled={disabledStatus}
                        >
                          Change Status
                        </Button>
                      </Stack>
                    )}
                  >
                    <Typography variant="body2" color="text.secondary">Items: {r.itemCount}</Typography>
                  </ResponsiveListItem>
                );
              })}
            </Stack>

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ px: 2, py: 2 }}
            >
              <Typography variant="body2" color="text.secondary">
                Total: {data.meta.total} • Page {state.page} of {data.meta.pages}
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

      {/* Status change menu */}
      <Menu
        anchorEl={menuAnchor}
        open={openMenu}
        onClose={closeStatusMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => setStatus('ordered')}>
          <ListItemIcon>
            <PendingActionsIcon fontSize="small" />
          </ListItemIcon>
          ordered
        </MenuItem>
        <MenuItem onClick={() => setStatus('on_delivery')}>
          <ListItemIcon>
            <LocalShippingIcon fontSize="small" />
          </ListItemIcon>
          on_delivery
        </MenuItem>
        <MenuItem onClick={() => setStatus('payment_collected')}>
          <ListItemIcon>
            <DoneIcon fontSize="small" />
          </ListItemIcon>
          payment_collected
        </MenuItem>
        <MenuItem onClick={() => setStatus('ready_to_receive')}>
          <ListItemIcon>
            <DoneIcon fontSize="small" />
          </ListItemIcon>
          ready_to_receive
        </MenuItem>
        <MenuItem onClick={() => setStatus('completed')}>
          <ListItemIcon>
            <DoneIcon fontSize="small" />
          </ListItemIcon>
          completed
        </MenuItem>
      </Menu>
    </Paper>
  );
}
