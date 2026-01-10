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
  Button,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptDetailsDialog from '@/components/pos/ReceiptDetailsDialog';
import CollectPaymentDialog from '@/components/pos/CollectPaymentDialog';
import { useI18n } from '@/components/i18n/useI18n';

export default function DepositReceiptsPage() {
  const { t, formatDate, formatNumber } = useI18n();

  const [query, setQuery] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [rows, setRows] = React.useState([]);
  const [meta, setMeta] = React.useState({ total: 0, pages: 1 });

  const [detailsId, setDetailsId] = React.useState(null);
  const [collectOpen, setCollectOpen] = React.useState(false);
  const [collectInfo, setCollectInfo] = React.useState({ id: null, due: 0 });

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        query,
        status: 'pending',
        type: 'sale',
        page: String(page),
        limit: String(limit),
        sort: 'date',
        order: 'desc',
      });
      if (dateFrom) qs.set('dateFrom', dateFrom);
      if (dateTo) qs.set('dateTo', dateTo);

      const res = await fetch(`/api/receipts?${qs.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed to load deposit receipts');
      const items = (json.items || []).map((r) => ({ ...r, _id: String(r._id) }));
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

  return (
    <Paper sx={{ p: 2 }}>
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ mr: 1 }}>
          {t('nav.depositReceipts')}
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
                <TableCell>{t('pos.customer')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="right">{t('receipt.paid')}</TableCell>
                <TableCell align="right">{t('collectPayment.due')}</TableCell>
                <TableCell align="right">{t('common.total')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      {t('receipts.none')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const customerLabel = r?.customer
                  ? [r.customer.name || t('common.noName'), r.customer.phone || '']
                      .filter(Boolean)
                      .join(' • ')
                  : '-';

                return (
                  <TableRow key={String(r._id)} hover>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell>{customerLabel}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.status} />
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(Number(r.paidTotal || 0), {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(Number(r.dueTotal || 0), {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(Number(r.grandTotal || 0), {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => setDetailsId(String(r._id))}
                        >
                          {t('common.view')}
                        </Button>
                        <Button
                          size="small"
                          startIcon={<PaymentsIcon />}
                          onClick={() => {
                            setCollectInfo({ id: String(r._id), due: Number(r.dueTotal || 0) });
                            setCollectOpen(true);
                          }}
                        >
                          {t('pos.collectPayment')}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('common.total')}: {meta.total} • {t('common.page')} {page} {t('common.of')} {meta.pages || 1}
            </Typography>
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
      <CollectPaymentDialog
        open={collectOpen}
        onClose={() => setCollectOpen(false)}
        receiptId={collectInfo.id}
        dueTotal={collectInfo.due}
        onDone={() => {
          setCollectOpen(false);
          fetchList();
        }}
      />
    </Paper>
  );
}

