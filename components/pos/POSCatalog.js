'use client';

import * as React from 'react';
import {
  Box, Stack, TextField, InputAdornment, IconButton, Typography,
  Accordion, AccordionSummary, AccordionDetails, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  Pagination, CircularProgress, Button, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';

function useDebounced(value, delay = 400) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function POSCatalog({ onPickVariant }) {
  const [query, setQuery] = React.useState('');
  const q = useDebounced(query);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [meta, setMeta] = React.useState({ total: 0, pages: 1 });

  const fetchList = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
      const res = await fetch(`/api/pos/search?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to load POS catalog');
      setItems(json.items || []);
      setMeta(json.meta || { total: 0, pages: 1 });
    } catch (e) {
      setError(e?.message || String(e));
      setItems([]);
      setMeta({ total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [q, page, limit]);

  React.useEffect(() => { fetchList(); }, [fetchList]);

  return (
    <Stack spacing={2} sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          fullWidth
          placeholder="Search by product code or company name"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
        />
        <IconButton onClick={fetchList} title="Refresh"><RefreshIcon /></IconButton>
      </Stack>

      <Box sx={{ position: 'relative', flex: 1, overflow: 'auto', borderRadius: 2 }}>
        {loading && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        )}

        {!loading && error && (
          <Typography color="error" sx={{ p: 2 }}>{error}</Typography>
        )}

        {!loading && !error && items.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 2 }}>No products found.</Typography>
        )}

        {!loading && !error && items.length > 0 && (
          <Stack spacing={1}>
            {items.map((p) => (
              <Accordion key={p._id} disableGutters elevation={1} defaultExpanded={false} sx={{ '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                    <Typography sx={{ minWidth: 160 }} fontWeight={600}>{p.code}</Typography>
                    <Typography sx={{ flex: 1 }}>{p.name || '-'}</Typography>
                    <Chip size="small" label={`${p.variants?.length || 0} variants`} />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Company</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Color</TableCell>
                        <TableCell align="right">On hand</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(p.variants || []).map((v) => (
                        <TableRow key={v._id} hover>
                          <TableCell>{v.company?.name || '-'}</TableCell>
                          <TableCell>{v.size}</TableCell>
                          <TableCell>{v.color}</TableCell>
                          <TableCell align="right">
                            <Chip size="small" color={v.qty > 0 ? 'success' : 'default'} label={v.qty} />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title={v.qty <= 0 ? 'Out of stock' : 'Add to cart'}>
                              <span>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={v.qty <= 0}
                                  onClick={() => onPickVariant && onPickVariant(v, p)}
                                >
                                  Add
                                </Button>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </Box>

      <Stack direction="row" justifyContent="flex-end" alignItems="center">
        <Pagination
          page={page}
          count={meta.pages || 1}
          onChange={(_e, p) => setPage(p)}
          color="primary"
          shape="rounded"
          showFirstButton
          showLastButton
        />
      </Stack>
    </Stack>
  );
}


