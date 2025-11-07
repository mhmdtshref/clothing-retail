'use client';

import * as React from 'react';
import { Stack, TextField, MenuItem, Typography, CircularProgress, Autocomplete } from '@mui/material';

export default function OptimusForm({ value, onChange, disabled = false }) {
  const [cities, setCities] = React.useState([]);
  const [areas, setAreas] = React.useState([]);
  const [loadingCities, setLoadingCities] = React.useState(false);
  const [loadingAreas, setLoadingAreas] = React.useState(false);
  const [error, setError] = React.useState('');
  const [contactQuery, setContactQuery] = React.useState('');
  const [contactOptions, setContactOptions] = React.useState([]);
  const [loadingContacts, setLoadingContacts] = React.useState(false);

  const v = value || { cityId: '', areaId: '', cityName: '', areaName: '', name: '', phone: '', addressLine: '', codAmount: '' };
  const latestVRef = React.useRef(v);
  React.useEffect(() => {
    latestVRef.current = v;
  }, [v]);

  React.useEffect(() => {
    let active = true;
    setLoadingCities(true);
    setError('');
    fetch('/api/delivery/optimus/cities', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        if (!json?.ok) throw new Error(json?.message || json?.error || 'Failed to load cities');
        setCities(Array.isArray(json.items) ? json.items : []);
      })
      .catch((e) => setError(e?.message || String(e)))
      .finally(() => setLoadingCities(false));
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    let active = true;
    if (!v.cityId) { setAreas([]); return () => {}; }
    setLoadingAreas(true);
    setError('');
    fetch(`/api/delivery/optimus/areas?cityId=${encodeURIComponent(v.cityId)}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        if (!json?.ok) throw new Error(json?.message || json?.error || 'Failed to load areas');
        setAreas(Array.isArray(json.items) ? json.items : []);
      })
      .catch((e) => setError(e?.message || String(e)))
      .finally(() => setLoadingAreas(false));
    return () => { active = false; };
  }, [v.cityId]);

  function normalizeName(name) {
    return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  async function ensureIdsFromNames(provider) {
    const { cityName: cName, areaName: aName } = provider || {};
    let patch = {};
    // Resolve city by name if we have a name but no id yet
    if (cName && !v.cityId) {
      let list = cities;
      if (!Array.isArray(list) || list.length === 0) {
        try {
          const r = await fetch('/api/delivery/optimus/cities', { cache: 'force-cache', credentials: 'include' });
          const j = await r.json();
          if (r.ok && Array.isArray(j.items)) list = j.items;
        } catch {}
      }
      const match = (list || []).find((c) => normalizeName(c.name) === normalizeName(cName));
      if (match) {
        patch.cityId = match.id;
        patch.cityName = match.name;
      }
    }
    // Resolve area by name if we have cityId (possibly set above) and areaName
    const resolvedCityId = patch.cityId || v.cityId;
    if (aName && resolvedCityId && !v.areaId) {
      let listA = [];
      try {
        const r = await fetch(`/api/delivery/optimus/areas?cityId=${encodeURIComponent(String(resolvedCityId))}`, { cache: 'force-cache', credentials: 'include' });
        const j = await r.json();
        if (r.ok && Array.isArray(j.items)) listA = j.items;
      } catch {}
      const matchA = (listA || []).find((a) => normalizeName(a.name) === normalizeName(aName));
      if (matchA) {
        patch.areaId = matchA.id;
        patch.areaName = matchA.name;
      }
    }
    if (Object.keys(patch).length) update(patch);
  }

  // Contact search (name or phone)
  React.useEffect(() => {
    let t;
    if (!contactQuery) { setContactOptions([]); return () => {}; }
    setLoadingContacts(true);
    t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(contactQuery)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || json?.error || 'Search failed');
        setContactOptions(Array.isArray(json.items) ? json.items : []);
      } catch (_e) {
        // ignore errors in suggestions
      } finally {
        setLoadingContacts(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [contactQuery]);

  const update = (patch) => {
    const base = latestVRef.current || {};
    onChange?.({ ...base, ...patch });
  };

  const phoneValid = /^\d{10}$/.test(String(v.phone || '').replace(/\D/g, ''));
  const cityObj = cities.find((c) => c.id === v.cityId) || null;
  const areaObj = areas.find((a) => a.id === v.areaId) || null;

  return (
    <Stack spacing={2}>
      <TextField
        label="Address Line 1"
        value={v.addressLine}
        onChange={(e) => update({ addressLine: e.target.value })}
        disabled={disabled}
        fullWidth
      />

      <TextField
        label="COD Amount"
        type="number"
        inputProps={{ min: 0, step: '0.01' }}
        value={v.codAmount}
        onChange={(e) => update({ codAmount: e.target.value })}
        disabled={disabled}
        helperText="Include delivery fees if needed"
        fullWidth
      />
      {error && <Typography color="error" variant="body2">{error}</Typography>}
      <Autocomplete
        freeSolo
        options={contactOptions}
        loading={loadingContacts}
        getOptionLabel={(o) => (o && typeof o === 'object') ? `${o.name || '(No name)'} • ${o.phone || ''}` : String(o || '')}
        onInputChange={(_e, val) => setContactQuery(val)}
        onChange={(_e, val) => {
          if (val && typeof val === 'object') {
            const name = String(val.name || '');
            const phone = String(val.phone || '').replace(/\D/g, '').slice(0, 10);
            const provider = val.provider || {};
            const patch = { name, phone };
            if (provider.addressLine) patch.addressLine = provider.addressLine;
            // Fallback to top-level addressLine from suggestion if provider doesn't include it
            if (!patch.addressLine && val.addressLine) patch.addressLine = val.addressLine;
            if (!v.cityId && provider.cityId) patch.cityId = provider.cityId;
            if (!v.areaId && provider.areaId) patch.areaId = provider.areaId;
            if (!v.cityName && provider.cityName) patch.cityName = provider.cityName;
            if (!v.areaName && provider.areaName) patch.areaName = provider.areaName;
            update(patch);
            // If only names are available, resolve ids by name
            if ((!provider.cityId && provider.cityName) || (!provider.areaId && provider.areaName)) {
              ensureIdsFromNames(provider);
            }
          }
        }}
        renderInput={(params) => (
          <TextField {...params} label="Search Contact (name or phone)" placeholder="Type name or phone" fullWidth />
        )}
        fullWidth
      />
      <TextField
        select
        label="City"
        value={v.cityId}
        onChange={(e) => update({ cityId: e.target.value, cityName: (cities.find((c) => c.id === e.target.value)?.name) || '', areaId: '', areaName: '' })}
        disabled={disabled}
        helperText={loadingCities ? 'Loading cities…' : ''}
        fullWidth
      >
        {loadingCities ? (
          <MenuItem value="" disabled>
            <CircularProgress size={16} sx={{ mr: 1 }} /> Loading…
          </MenuItem>
        ) : cities.map((c) => (
          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Area"
        value={v.areaId}
        onChange={(e) => update({ areaId: e.target.value, areaName: (areas.find((a) => a.id === e.target.value)?.name) || '' })}
        disabled={disabled || !v.cityId}
        helperText={!v.cityId ? 'Select city first' : (loadingAreas ? 'Loading areas…' : '')}
        fullWidth
      >
        {loadingAreas ? (
          <MenuItem value="" disabled>
            <CircularProgress size={16} sx={{ mr: 1 }} /> Loading…
          </MenuItem>
        ) : areas.map((a) => (
          <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
        ))}
      </TextField>

      <TextField
        label="Customer Name"
        value={v.name}
        onChange={(e) => update({ name: e.target.value })}
        disabled={disabled}
        fullWidth
      />
      <TextField
        label="Phone (10 digits)"
        value={v.phone}
        onChange={(e) => update({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
        error={!!v.phone && !phoneValid}
        helperText={!v.phone ? 'Required' : (!phoneValid ? 'Enter 10 digits' : '')}
        disabled={disabled}
        fullWidth
      />

      {cityObj && areaObj && (
        <Typography variant="caption" color="text.secondary">
          Selected: {cityObj.name} / {areaObj.name}
        </Typography>
      )}
    </Stack>
  );
}
