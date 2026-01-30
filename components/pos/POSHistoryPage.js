'use client';

import * as React from 'react';
import {
  Paper,
  Toolbar,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentsIcon from '@mui/icons-material/Payments';
import CollectPaymentDialog from '@/components/pos/CollectPaymentDialog';
import ReceiptDetailsDialog from '@/components/pos/ReceiptDetailsDialog';
import { useI18n } from '@/components/i18n/useI18n';

function formatYYYYMMDD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function POSHistoryPage() {
  const { t, formatDate, formatNumber } = useI18n();
  const today = formatYYYYMMDD(new Date());
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [type, setType] = React.useState('sales');
  const [dateFrom, setDateFrom] = React.useState(today);
  const [dateTo, setDateTo] = React.useState(today);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
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
        status,
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
      let items = (json.items || []).map((r) => ({ ...r, _id: String(r._id) }));
      if (type === 'sales') {
        items = items.filter((r) => ['sale', 'sale_return'].includes(r?.type));
      }
      setRows(items);
      setMeta(json.meta || { total: 0, pages: 1 });
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [query, status, type, dateFrom, dateTo, page, limit]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onPrint = (id) => {
    setDetailsId(String(id));
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
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

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="status-label">{t('common.status')}</InputLabel>
          <Select
            labelId="status-label"
            label={t('common.status')}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="all">all</MenuItem>
            <MenuItem value="completed">completed</MenuItem>
            <MenuItem value="ordered">ordered</MenuItem>
            <MenuItem value="on_delivery">on_delivery</MenuItem>
            <MenuItem value="pending">pending</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="type-label">{t('common.type')}</InputLabel>
          <Select
            labelId="type-label"
            label={t('common.type')}
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="sales">{t('pos.salesOnly')}</MenuItem>
            <MenuItem value="all">{t('common.all')}</MenuItem>
          </Select>
        </FormControl>

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

        <IconButton onClick={fetchList}>
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
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="right">{t('pos.items')}</TableCell>
                <TableCell align="right">{t('common.total')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      {t('receipts.none')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={String(r._id)} hover>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.status}
                      color={r.status === 'completed' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">{r.itemCount}</TableCell>
                  <TableCell align="right">
                    {formatNumber(Number(r.grandTotal || 0), {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setDetailsId(String(r._id))}
                    >
                      {t('common.view')}
                    </Button>
                    <Button
                      size="small"
                      startIcon={<PrintIcon />}
                      onClick={() => onPrint(String(r._id))}
                    >
                      {t('common.print')}
                    </Button>
                    {r.type === 'sale' && r.status === 'pending' && (
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
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Stack direction="row" justifyContent="flex-end" sx={{ px: 2, py: 2 }}>
            <Pagination page={page} count={meta.pages || 1} onChange={(_e, p) => setPage(p)} />
          </Stack>
        </>
      )}

      <ReceiptDetailsDialog
        id={detailsId}
        open={Boolean(detailsId)}
        onClose={() => setDetailsId(null)}
      />
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
