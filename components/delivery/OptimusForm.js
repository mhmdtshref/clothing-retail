'use client';

import * as React from 'react';
import {
  Stack,
  TextField,
  MenuItem,
  Typography,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';

const EMPTY_PROVIDER = {
  cityId: '',
  areaId: '',
  cityName: '',
  areaName: '',
  name: '',
  phone: '',
  addressLine: '',
  codAmount: '',
  deliveryFees: '',
};

export default function OptimusForm({
  value,
  onChange,
  disabled = false,
  amountFieldMode = 'cod',
}) {
  const { t } = useI18n();
  const [cities, setCities] = React.useState([]);
  const [areas, setAreas] = React.useState([]);
  const [loadingCities, setLoadingCities] = React.useState(false);
  const [loadingAreas, setLoadingAreas] = React.useState(false);
  const [error, setError] = React.useState('');
  const [contactQuery, setContactQuery] = React.useState('');
  const [contactOptions, setContactOptions] = React.useState([]);
  const [loadingContacts, setLoadingContacts] = React.useState(false);

  const v = React.useMemo(() => value || EMPTY_PROVIDER, [value]);
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
        if (!json?.ok) throw new Error(t('errors.loadCities'));
        setCities(Array.isArray(json.items) ? json.items : []);
      })
      .catch((e) => setError(e?.message || String(e)))
      .finally(() => setLoadingCities(false));
    return () => {
      active = false;
    };
  }, [t]);

  React.useEffect(() => {
    let active = true;
    if (!v.cityId) {
      setAreas([]);
      return () => {};
    }
    setLoadingAreas(true);
    setError('');
    fetch(`/api/delivery/optimus/areas?cityId=${encodeURIComponent(v.cityId)}`, {
      cache: 'force-cache',
    })
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        if (!json?.ok) throw new Error(t('errors.loadAreas'));
        setAreas(Array.isArray(json.items) ? json.items : []);
      })
      .catch((e) => setError(e?.message || String(e)))
      .finally(() => setLoadingAreas(false));
    return () => {
      active = false;
    };
  }, [v.cityId, t]);

  function normalizeName(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function ensureIdsFromNames(provider) {
    const { cityName: cName, areaName: aName } = provider || {};
    let patch = {};
    // Resolve city by name if we have a name but no id yet
    if (cName && !v.cityId) {
      let list = cities;
      if (!Array.isArray(list) || list.length === 0) {
        try {
          const r = await fetch('/api/delivery/optimus/cities', {
            cache: 'force-cache',
            credentials: 'include',
          });
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
        const r = await fetch(
          `/api/delivery/optimus/areas?cityId=${encodeURIComponent(String(resolvedCityId))}`,
          { cache: 'force-cache', credentials: 'include' },
        );
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
    let timeoutId;
    if (!contactQuery) {
      setContactOptions([]);
      return () => {};
    }
    setLoadingContacts(true);
    timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(contactQuery)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(t('errors.searchFailed'));
        setContactOptions(Array.isArray(json.items) ? json.items : []);
      } catch (_e) {
        // ignore errors in suggestions
      } finally {
        setLoadingContacts(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [contactQuery, t]);

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
        label={t('delivery.addressLine')}
        value={v.addressLine}
        onChange={(e) => update({ addressLine: e.target.value })}
        disabled={disabled}
        fullWidth
      />

      {amountFieldMode === 'cod' ? (
        <TextField
          label={t('delivery.codAmount')}
          type="number"
          inputProps={{ min: 0, step: '0.01' }}
          value={v.codAmount}
          onChange={(e) => update({ codAmount: e.target.value })}
          disabled={disabled}
          helperText={t('delivery.includeFeesHint')}
          fullWidth
        />
      ) : (
        <TextField
          label={t('delivery.deliveryFees')}
          type="number"
          inputProps={{ min: 0, step: '0.01' }}
          value={v.deliveryFees || ''}
          onChange={(e) => update({ deliveryFees: e.target.value })}
          disabled={disabled}
          helperText={t('delivery.autoCodHint')}
          fullWidth
        />
      )}
      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}
      <Autocomplete
        freeSolo
        options={contactOptions}
        loading={loadingContacts}
        getOptionLabel={(o) => {
          if (!o || typeof o !== 'object') return String(o || '');
          const provider = o.provider || {};
          const cityArea = [provider.cityName, provider.areaName].filter(Boolean).join(' / ');
          const base = `${o.name || t('common.noName')} • ${o.phone || ''}`;
          return cityArea ? `${base} • ${cityArea}` : base;
        }}
        renderOption={(props, option, { index }) => {
          const provider = option && typeof option === 'object' ? option.provider || {} : {};
          const keyParts = [
            option && typeof option === 'object' ? (option._id ?? '') : '',
            option && typeof option === 'object' ? (option.phone ?? '') : '',
            provider.cityId ?? '',
            provider.areaId ?? '',
            provider.addressLine ?? '',
            index,
          ];
          const k = keyParts.map((p) => String(p)).join('|');
          const cityArea = [provider.cityName, provider.areaName].filter(Boolean).join(' / ');
          const fallback =
            option && typeof option === 'object'
              ? `${option.name || t('common.noName')} • ${option.phone || ''}`
              : String(option || '');
          const nameLabel =
            option && typeof option === 'object' ? option.name || t('common.noName') : '';
          const display = [nameLabel, cityArea].filter(Boolean).join(' • ') || fallback;
          return (
            <li {...props} key={k}>
              {display}
            </li>
          );
        }}
        onInputChange={(_e, val) => setContactQuery(val)}
        onChange={(_e, val) => {
          if (val && typeof val === 'object') {
            const name = String(val.name || '');
            const phone = String(val.phone || '')
              .replace(/\D/g, '')
              .slice(0, 10);
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
            if (
              (!provider.cityId && provider.cityName) ||
              (!provider.areaId && provider.areaName)
            ) {
              ensureIdsFromNames(provider);
            }
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('delivery.searchContact')}
            placeholder={t('delivery.searchContactPlaceholder')}
            fullWidth
          />
        )}
        fullWidth
      />
      <TextField
        select
        label={t('delivery.city')}
        value={v.cityId}
        onChange={(e) =>
          update({
            cityId: e.target.value,
            cityName: cities.find((c) => c.id === e.target.value)?.name || '',
            areaId: '',
            areaName: '',
          })
        }
        disabled={disabled}
        helperText={loadingCities ? t('delivery.loadingCities') : ''}
        fullWidth
      >
        {loadingCities ? (
          <MenuItem value="" disabled>
            <CircularProgress size={16} sx={{ mr: 1 }} /> {t('common.loading')}
          </MenuItem>
        ) : (
          cities.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))
        )}
      </TextField>

      <TextField
        select
        label={t('delivery.area')}
        value={v.areaId}
        onChange={(e) =>
          update({
            areaId: e.target.value,
            areaName: areas.find((a) => a.id === e.target.value)?.name || '',
          })
        }
        disabled={disabled || !v.cityId}
        helperText={
          !v.cityId ? t('delivery.selectCityFirst') : loadingAreas ? t('delivery.loadingAreas') : ''
        }
        fullWidth
      >
        {loadingAreas ? (
          <MenuItem value="" disabled>
            <CircularProgress size={16} sx={{ mr: 1 }} /> {t('common.loading')}
          </MenuItem>
        ) : (
          areas.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.name}
            </MenuItem>
          ))
        )}
      </TextField>

      <TextField
        label={t('common.name')}
        value={v.name}
        onChange={(e) => update({ name: e.target.value })}
        disabled={disabled}
        fullWidth
      />
      <TextField
        label={t('common.phone')}
        value={v.phone}
        onChange={(e) => update({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
        error={!!v.phone && !phoneValid}
        helperText={!v.phone ? t('common.required') : !phoneValid ? t('errors.phone10Digits') : ''}
        disabled={disabled}
        fullWidth
      />

      {cityObj && areaObj && (
        <Typography variant="caption" color="text.secondary">
          {t('common.selected')}: {cityObj.name} / {areaObj.name}
        </Typography>
      )}
    </Stack>
  );
}
