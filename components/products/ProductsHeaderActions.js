'use client';

import * as React from 'react';
import Link from 'next/link';
import { Stack, Button } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';

export default function ProductsHeaderActions() {
  const { t } = useI18n();
  return (
    <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
      <Link href="/products/new" style={{ textDecoration: 'none' }}>
        <Button variant="contained">{t('products.new')}</Button>
      </Link>
    </Stack>
  );
}


