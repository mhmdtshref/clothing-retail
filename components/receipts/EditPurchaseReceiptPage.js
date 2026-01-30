'use client';

import * as React from 'react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';
import PurchaseReceiptForm from '@/components/receipts/PurchaseReceiptForm';

export default function EditPurchaseReceiptPage({ id, companies }) {
  const { t } = useI18n();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [receipt, setReceipt] = React.useState(null);
  const [readOnly, setReadOnly] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/receipts/${id}`, { cache: 'no-store' }),
          fetch(`/api/receipts/${id}/editable`, { cache: 'no-store' }),
        ]);
        const j1 = await r1.json();
        const j2 = await r2.json();
        if (!r1.ok) throw new Error(j1?.message || j1?.error || 'Failed to load receipt');
        if (!cancelled) {
          setReceipt(j1.receipt || null);
          setReadOnly(j2?.editable === false);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!receipt) {
    return <Alert severity="warning">Receipt not found.</Alert>;
  }

  if (receipt.type !== 'purchase') {
    return <Alert severity="warning">This editor is for purchase receipts only.</Alert>;
  }

  return (
    <>
      {readOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('status.completed')}: {t('common.saved')}
        </Alert>
      )}
      <PurchaseReceiptForm
        companies={companies}
        mode="edit"
        receiptId={id}
        initialReceipt={receipt}
        readOnly={readOnly}
      />
    </>
  );
}
