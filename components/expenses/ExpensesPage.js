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

const DEFAULTS = {
  q: '',
  categoryId: '',
  start: '',
  end: '',
  page: 1,
  limit: 20,
};

export default function ExpensesPage() {
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
      if (!res.ok) throw new Error('Failed to load categories');
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
      if (!res.ok) throw new Error('Failed to load expenses');
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
          placeholder="Search vendor or note"
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
          <InputLabel id="category-label">Category</InputLabel>
          <Select
            labelId="category-label"
            label="Category"
            value={filters.categoryId}
            onChange={(e) => setFilters((s) => ({ ...s, categoryId: e.target.value, page: 1 }))}
          >
            <MenuItem value="">All</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Start date"
          type="date"
          value={filters.start}
          onChange={(e) => setFilters((s) => ({ ...s, start: e.target.value, page: 1 }))}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="End date"
          type="date"
          value={filters.end}
          onChange={(e) => setFilters((s) => ({ ...s, end: e.target.value, page: 1 }))}
          InputLabelProps={{ shrink: true }}
        />

        <Button startIcon={<CategoryIcon />} onClick={() => setShowCategoryDialog(true)}>
          New Category
        </Button>

        <Button startIcon={<AddIcon />} variant="contained" onClick={onNewExpense}>
          New Expense
        </Button>

        <IconButton onClick={fetchExpenses} title="Refresh">
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
                  <TableCell>Date</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        No expenses found. Try adjusting filters or create a new expense.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {data.items.map((e) => (
                  <TableRow key={e._id} hover>
                    <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                    <TableCell>{e.categoryName || '-'}</TableCell>
                    <TableCell>{e.vendor || '-'}</TableCell>
                    <TableCell>{e.note || '-'}</TableCell>
                    <TableCell align="right">{Number(e.amount || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => onEditExpense(e)} title="Edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => onDeleteExpense(e._id)} title="Delete">
                        <DeleteForeverIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Total: {data.meta.total} • Pages: {data.meta.pages} • Sum: {Number(data.meta.totalAmount || 0).toFixed(2)}
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
        <DialogTitle>Delete expense?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this expense?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete({ open: false, expenseId: null })}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteNow}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}


