'use client';

import * as React from 'react';
import {
  Paper,
  Toolbar,
  Stack,
  Button,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  CircularProgress,
  IconButton,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import CompanyDialog from '@/components/companies/CompanyDialog';
import { useI18n } from '@/components/i18n/useI18n';
import ResponsiveListItem from '@/components/common/ResponsiveListItem';
import { normalizeCompanyName } from '@/lib/company-name';

export default function CompaniesPage() {
  const { t } = useI18n();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const fetchCompanies = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/companies');
      const json = await res.json();
      if (!res.ok) throw new Error(t('errors.loadCompanies'));
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setError(e?.message || t('errors.loadCompanies'));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filteredItems = React.useMemo(() => {
    const q = normalizeCompanyName(searchQuery);
    if (!q) return items || [];
    return (items || []).filter((c) => normalizeCompanyName(c?.name || '').includes(q));
  }, [items, searchQuery]);

  function onAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function onEdit(row) {
    setEditing(row);
    setDialogOpen(true);
  }

  function onCloseDialog() {
    setDialogOpen(false);
  }

  async function onSaved() {
    await fetchCompanies();
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Toolbar sx={{ px: 0 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {t('companies.title')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('companies.searchPlaceholder')}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" style={{ opacity: 0.7, marginRight: 8 }} />,
            }}
            sx={{ width: { xs: 180, sm: 260 } }}
          />
          <Button onClick={onAdd} variant="contained" startIcon={<AddIcon />}>{t('companies.add')}</Button>
        </Stack>
      </Toolbar>

      {loading ? (
        <Box sx={{ py: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <Box sx={{ py: 3 }}>
          <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>
          <Button onClick={fetchCompanies} startIcon={<AddIcon />} variant="outlined">{t('common.retry')}</Button>
        </Box>
      ) : (
        <>
        <Table size="small" sx={{ display: { xs: 'none', sm: 'table' } }}>
          <TableHead>
            <TableRow>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell width={120} align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="body2" color="text.secondary">{t('companies.none')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((row) => (
                <TableRow key={String(row._id)} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
          {filteredItems.length === 0 && (
            <Typography variant="body2" color="text.secondary">{t('companies.none')}</Typography>
          )}
          {filteredItems.map((row) => (
            <ResponsiveListItem
              key={String(row._id)}
              title={row.name}
              actions={(
                <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={() => onEdit(row)}>
                  {t('common.edit') || 'Edit'}
                </Button>
              )}
            />
          ))}
        </Stack>
        </>
      )}

      <CompanyDialog
        open={dialogOpen}
        onClose={onCloseDialog}
        onSaved={onSaved}
        initialValue={editing}
        existingCompanies={items}
      />
    </Paper>
  );
}


