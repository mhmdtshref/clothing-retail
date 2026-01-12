'use client';

import * as React from 'react';
import {
  Paper,
  Toolbar,
  TextField,
  InputAdornment,
  Stack,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Pagination,
  Chip,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptDetailsDialog from '@/components/pos/ReceiptDetailsDialog';
import { useI18n } from '@/components/i18n/useI18n';
import { printUrlInIframe } from '@/lib/print/printUrlInIframe';

function formatYYYYMMDD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function SalesReceiptsPage() {
  const { t, formatDate, formatNumber } = useI18n();
  const today = formatYYYYMMDD(new Date());

  const [query, setQuery] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState(today);
  const [dateTo, setDateTo] = React.useState(today);
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [rows, setRows] = React.useState([]);
  const [meta, setMeta] = React.useState({ total: 0, pages: 1 });
  const [detailsId, setDetailsId] = React.useState(null);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        query,
        status: 'all',
        type: 'all',
        dateFrom,
        dateTo,
        page: String(page),
        limit: String(limit),
        sort: 'date',
        order: 'desc',
      });
      const res = await fetch(`/api/receipts?${qs.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed to load receipts');

      const items = (json.items || [])
        .filter((r) => ['sale', 'sale_return'].includes(r?.type))
        .map((r) => ({ ...r, _id: String(r._id) }));

      setRows(items);
      setMeta(json.meta || { total: 0, pages: 1 });
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [query, dateFrom, dateTo, page, limit]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onPrint = (id) => {
    printUrlInIframe(`/pos/print/${encodeURIComponent(String(id))}?autoprint=0`).catch(() => {});
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ mr: 1 }}>
          {t('nav.salesReceipts')}
        </Typography>

        <TextField
          size="small"
          placeholder={t('pos.historySearchPlaceholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 260 }}
        />

        <TextField
          size="small"
          label={t('common.from')}
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label={t('common.to')}
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          InputLabelProps={{ shrink: true }}
        />

        <IconButton onClick={fetchList} title={t('common.refresh')}>
          <RefreshIcon />
        </IconButton>
      </Toolbar>

      {loading && <Typography sx={{ p: 2 }}>{t('common.loading')}</Typography>}
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
                <TableCell>{t('common.date')}</TableCell>
                <TableCell>{t('common.type')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="right">{t('pos.items')}</TableCell>
                <TableCell align="right">{t('common.total')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      {t('receipts.none')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={String(r._id)} hover>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell>{r.type}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status} color={r.status === 'completed' ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="right">{r.itemCount}</TableCell>
                  <TableCell align="right">
                    {formatNumber(Number(r.grandTotal || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title={t('common.view')}>
                        <IconButton size="small" onClick={() => setDetailsId(String(r._id))} aria-label="View receipt">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.print')}>
                        <IconButton size="small" onClick={() => onPrint(String(r._id))} aria-label="Print receipt">
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack direction="row" justifyContent="flex-end" sx={{ px: 2, py: 2 }}>
            <Pagination
              page={page}
              count={meta.pages || 1}
              onChange={(_e, p) => setPage(p)}
              shape="rounded"
              showFirstButton
              showLastButton
            />
          </Stack>
        </>
      )}

      <ReceiptDetailsDialog id={detailsId} open={Boolean(detailsId)} onClose={() => setDetailsId(null)} />
    </Paper>
  );
}

