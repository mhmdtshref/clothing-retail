'use client';

import * as React from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CategoryIcon from '@mui/icons-material/Category';
import ExpenseFormDialog from '@/components/expenses/ExpenseFormDialog';
import ExpenseCategoryDialog from '@/components/expenses/ExpenseCategoryDialog';
import { useI18n } from '@/components/i18n/useI18n';

const DEFAULTS = {
  q: '',
  categoryId: '',
  start: '',
  end: '',
  page: 1,
  limit: 20,
};

export default function ExpensesPage() {
  const { t, formatDate, formatNumber } = useI18n();
  const [filters, setFilters] = React.useState(DEFAULTS);
  const [categories, setCategories] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [data, setData] = React.useState({ items: [], meta: { total: 0, totalAmount: 0, pages: 1 } });

  const [showExpenseDialog, setShowExpenseDialog] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState(null);
  const [showCategoryDialog, setShowCategoryDialog] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState({ open: false, expenseId: null });

  const fetchCategories = React.useCallback(async () => {
    try {
      const res = await fetch('/api/expense-categories');
      const json = await res.json();
      if (!res.ok) throw new Error(t('errors.loadCategories'));
      setCategories(json.items || []);
    } catch (e) {
      // keep UI usable even if categories fail
    }
  }, []);

  const fetchExpenses = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.start) params.set('start', filters.start);
      if (filters.end) params.set('end', filters.end);
      params.set('page', String(filters.page));
      params.set('limit', String(filters.limit));
      const res = await fetch(`/api/expenses?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(t('errors.loadExpenses'));
      const pages = Math.max(1, Math.ceil((json?.meta?.total || 0) / filters.limit));
      setData({ items: json.items || [], meta: { total: json?.meta?.total || 0, totalAmount: json?.meta?.totalAmount || 0, pages } });
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [filters.q, filters.categoryId, filters.start, filters.end, filters.page, filters.limit]);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const onNewExpense = () => {
    setEditingExpense(null);
    setShowExpenseDialog(true);
  };
  const onEditExpense = (exp) => {
    setEditingExpense(exp);
    setShowExpenseDialog(true);
  };
  const onDeleteExpense = async (id) => {
    setConfirmDelete({ open: true, expenseId: id });
  };
  const confirmDeleteNow = async () => {
    const id = confirmDelete.expenseId;
    setConfirmDelete({ open: false, expenseId: null });
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error('Delete failed');
      fetchExpenses();
    } catch (e) {
      // Optionally show error
    }
  };

  const onExpenseSaved = () => {
    setShowExpenseDialog(false);
    setEditingExpense(null);
    fetchExpenses();
  };

  const onCategorySaved = () => {
    setShowCategoryDialog(false);
    fetchCategories();
  };

  const onPageChange = (_evt, p) => setFilters((s) => ({ ...s, page: p }));

  return (
    <Paper sx={{ p: 2 }}>
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder={t('expenses.searchPlaceholder')}
          value={filters.q}
          onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value, page: 1 }))}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 240 }}
        />

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="category-label">{t('expenses.category')}</InputLabel>
          <Select
            labelId="category-label"
            label={t('expenses.category')}
            value={filters.categoryId}
            onChange={(e) => setFilters((s) => ({ ...s, categoryId: e.target.value, page: 1 }))}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label={t('expenses.startDate')}
          type="date"
          value={filters.start}
          onChange={(e) => setFilters((s) => ({ ...s, start: e.target.value, page: 1 }))}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label={t('expenses.endDate')}
          type="date"
          value={filters.end}
          onChange={(e) => setFilters((s) => ({ ...s, end: e.target.value, page: 1 }))}
          InputLabelProps={{ shrink: true }}
        />

        <Button startIcon={<CategoryIcon />} onClick={() => setShowCategoryDialog(true)}>
          {t('expenses.newCategory')}
        </Button>

        <Button startIcon={<AddIcon />} variant="contained" onClick={onNewExpense}>
          {t('expenses.newExpense')}
        </Button>

        <IconButton onClick={fetchExpenses} title={t('common.refresh')}>
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
                  <TableCell>{t('common.date')}</TableCell>
                  <TableCell>{t('expenses.category')}</TableCell>
                  <TableCell>{t('expenses.vendor')}</TableCell>
                  <TableCell>{t('common.note')}</TableCell>
                  <TableCell align="right">{t('expenses.amount')}</TableCell>
                  <TableCell align="right">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        {t('expenses.none')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {data.items.map((e) => (
                  <TableRow key={e._id} hover>
                    <TableCell>{formatDate(e.date, { dateStyle: 'medium' })}</TableCell>
                    <TableCell>{e.categoryName || '-'}</TableCell>
                    <TableCell>{e.vendor || '-'}</TableCell>
                    <TableCell>{e.note || '-'}</TableCell>
                    <TableCell align="right">{formatNumber(Number(e.amount || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => onEditExpense(e)} title={t('common.edit')}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => onDeleteExpense(e._id)} title={t('common.delete')}>
                        <DeleteForeverIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('common.total')}: {formatNumber(data.meta.total)} • {t('expenses.pages')}: {formatNumber(data.meta.pages)} • {t('expenses.sum')}: {formatNumber(Number(data.meta.totalAmount || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Pagination page={filters.page} count={data.meta.pages || 1} onChange={onPageChange} color="primary" shape="rounded" showFirstButton showLastButton />
            </Stack>
          </>
        )}
      </Box>

      {showExpenseDialog && (
        <ExpenseFormDialog
          open={showExpenseDialog}
          onClose={() => setShowExpenseDialog(false)}
          onSaved={onExpenseSaved}
          categories={categories}
          initialValue={editingExpense}
        />
      )}

      {showCategoryDialog && (
        <ExpenseCategoryDialog open={showCategoryDialog} onClose={() => setShowCategoryDialog(false)} onSaved={onCategorySaved} />
      )}

      <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, expenseId: null })}>
        <DialogTitle>{t('expenses.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>{t('expenses.deleteConfirm')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete({ open: false, expenseId: null })}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteNow}>{t('common.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}


