'use client';

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material';

export default function CustomerDialog({ open, onClose, onSelect, initialValue }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setLoading(false);
    setError('');
    setName(initialValue?.name || '');
    setPhone(initialValue?.phone || '');
  }, [open, initialValue]);

  React.useEffect(() => {
    let t;
    if (!open) return () => {};
    if (!query) {
      setResults([]);
      return () => {};
    }
    setLoading(true);
    t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!res.ok) throw new Error('Search failed');
        setResults(Array.isArray(json.items) ? json.items : []);
        setError('');
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  async function handleCreate() {
    setCreating(true);
    try {
      const body = { name: name?.trim() || '', phone: phone || '' };
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed to save customer');
      const c = json?.customer;
      if (c && onSelect) onSelect(c);
      if (onClose) onClose();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Customer</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Search by name or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            fullWidth
          />

          {loading && <Typography variant="body2">Searching…</Typography>}
          {!loading && error && (
            <Typography color="error" variant="body2">{error}</Typography>
          )}

          {!loading && !error && results.length > 0 && (
            <List dense sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {results.map((c) => (
                <ListItem key={c._id} disablePadding>
                  <ListItemButton onClick={() => { if (onSelect) onSelect(c); if (onClose) onClose(); }}>
                    <ListItemText primary={c.name || '(No name)'} secondary={c.phone} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}

          <Divider />

          <Typography variant="subtitle2">Create new</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              size="small"
              fullWidth
            />
            <Button variant="contained" onClick={handleCreate} disabled={creating || !phone}>
              {creating ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}


