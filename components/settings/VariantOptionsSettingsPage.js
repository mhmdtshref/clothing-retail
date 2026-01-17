'use client';

import * as React from 'react';
import {
  Paper,
  Toolbar,
  Stack,
  Button,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  Box,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import { useI18n } from '@/components/i18n/useI18n';
import ResponsiveListItem from '@/components/common/ResponsiveListItem';
import { normalizeCompanyName } from '@/lib/company-name';
import { pickLocalizedName } from '@/lib/i18n/name';
import VariantColorDialog from '@/components/settings/VariantColorDialog';
import VariantSizeDialog from '@/components/settings/VariantSizeDialog';

function a11yProps(name, index) {
  return { id: `${name}-tab-${index}`, 'aria-controls': `${name}-tabpanel-${index}` };
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return (
    <Box role="tabpanel" id={`settings-tabpanel-${index}`} aria-labelledby={`settings-tab-${index}`}>
      <Box sx={{ pt: 2 }}>{children}</Box>
    </Box>
  );
}

export default function VariantOptionsSettingsPage() {
  const { t, locale } = useI18n();
  const [tab, setTab] = React.useState(0); // 0 colors, 1 sizes

  const [colors, setColors] = React.useState([]);
  const [sizes, setSizes] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  // dialogs
  const [colorDialogOpen, setColorDialogOpen] = React.useState(false);
  const [sizeDialogOpen, setSizeDialogOpen] = React.useState(false);
  const [editingColor, setEditingColor] = React.useState(null);
  const [editingSize, setEditingSize] = React.useState(null);

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cRes, sRes] = await Promise.all([fetch('/api/variant-colors'), fetch('/api/variant-sizes')]);
      const [cJson, sJson] = await Promise.all([cRes.json(), sRes.json()]);
      if (!cRes.ok) throw new Error(cJson?.message || t('errors.loadVariantColors'));
      if (!sRes.ok) throw new Error(sJson?.message || t('errors.loadVariantSizes'));
      setColors(Array.isArray(cJson.items) ? cJson.items : []);
      setSizes(Array.isArray(sJson.items) ? sJson.items : []);
    } catch (e) {
      setError(e?.message || t('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredColors = React.useMemo(() => {
    const q = normalizeCompanyName(searchQuery);
    if (!q) return colors || [];
    return (colors || []).filter((c) => {
      const en = normalizeCompanyName(c?.name?.en || '');
      const ar = normalizeCompanyName(c?.name?.ar || '');
      return en.includes(q) || ar.includes(q);
    });
  }, [colors, searchQuery]);

  const filteredSizes = React.useMemo(() => {
    const q = normalizeCompanyName(searchQuery);
    if (!q) return sizes || [];
    return (sizes || []).filter((s) => {
      const en = normalizeCompanyName(s?.name?.en || '');
      const ar = normalizeCompanyName(s?.name?.ar || '');
      return en.includes(q) || ar.includes(q);
    });
  }, [sizes, searchQuery]);

  const list = tab === 0 ? filteredColors : filteredSizes;
  const title = tab === 0 ? t('variantColors.title') : t('variantSizes.title');

  function onAdd() {
    if (tab === 0) {
      setEditingColor(null);
      setColorDialogOpen(true);
    } else {
      setEditingSize(null);
      setSizeDialogOpen(true);
    }
  }

  function onEdit(row) {
    if (tab === 0) {
      setEditingColor(row);
      setColorDialogOpen(true);
    } else {
      setEditingSize(row);
      setSizeDialogOpen(true);
    }
  }

  async function onSaved() {
    await fetchAll();
    setColorDialogOpen(false);
    setSizeDialogOpen(false);
    setEditingColor(null);
    setEditingSize(null);
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Toolbar sx={{ px: 0, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ flex: 1, minWidth: 200 }}>
          {t('settings.title')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('settings.searchPlaceholder')}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" style={{ opacity: 0.7, marginRight: 8 }} />,
            }}
            sx={{ width: { xs: 180, sm: 260 } }}
          />
          <Button onClick={onAdd} variant="contained" startIcon={<AddIcon />}>
            {tab === 0 ? t('variantColors.add') : t('variantSizes.add')}
          </Button>
        </Stack>
      </Toolbar>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={t('variantColors.title')} {...a11yProps('settings', 0)} />
        <Tab label={t('variantSizes.title')} {...a11yProps('settings', 1)} />
      </Tabs>

      {loading ? (
        <Box sx={{ py: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <Box sx={{ py: 3 }}>
          <Typography color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
          <Button onClick={fetchAll} startIcon={<AddIcon />} variant="outlined">
            {t('common.retry')}
          </Button>
        </Box>
      ) : (
        <TabPanel value={tab} index={tab}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {title}
          </Typography>

          <Table size="small" sx={{ display: { xs: 'none', sm: 'table' } }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell width={200}>{t('common.nameEn')}</TableCell>
                <TableCell width={200}>{t('common.nameAr')}</TableCell>
                <TableCell width={120} align="right">
                  {t('common.actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">
                      {tab === 0 ? t('variantColors.none') : t('variantSizes.none')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow key={String(row._id)} hover>
                    <TableCell>{pickLocalizedName(row?.name, locale)}</TableCell>
                    <TableCell>{row?.name?.en || ''}</TableCell>
                    <TableCell>{row?.name?.ar || ''}</TableCell>
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
            {list.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {tab === 0 ? t('variantColors.none') : t('variantSizes.none')}
              </Typography>
            )}
            {list.map((row) => (
              <ResponsiveListItem
                key={String(row._id)}
                title={pickLocalizedName(row?.name, locale)}
                subtitle={`${row?.name?.en || ''} • ${row?.name?.ar || ''}`}
                actions={
                  <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={() => onEdit(row)}>
                    {t('common.edit') || 'Edit'}
                  </Button>
                }
              />
            ))}
          </Stack>
        </TabPanel>
      )}

      <VariantColorDialog
        open={colorDialogOpen}
        onClose={() => setColorDialogOpen(false)}
        onSaved={onSaved}
        initialValue={editingColor}
        existingColors={colors}
      />
      <VariantSizeDialog
        open={sizeDialogOpen}
        onClose={() => setSizeDialogOpen(false)}
        onSaved={onSaved}
        initialValue={editingSize}
        existingSizes={sizes}
      />
    </Paper>
  );
}

