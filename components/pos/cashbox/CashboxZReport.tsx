'use client';

import * as React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';

export default function CashboxZReport({ report }: { report: any }) {
  const { t, formatDate, formatNumber } = useI18n();
  if (!report) return null;

  return (
    <Box sx={{ display: 'none' }} className="print-zreport">
      <style>
        {`
        @media print {
          body * { visibility: hidden !important; }
          .print-zreport, .print-zreport * { visibility: visible !important; }
          .print-zreport { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
        }
        `}
      </style>
      <Box sx={{ maxWidth: 480, margin: '0 auto', p: 2 }}>
        <Typography variant="h6" align="center">
          {t('cashbox.zreport.title')}
        </Typography>
        <Typography variant="body2" align="center" sx={{ mb: 1 }}>
          {t('cashbox.zreport.session')} #{String(report?.sessionId || '').slice(-6)}
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={0.5}>
          <Typography variant="body2">
            {t('cashbox.zreport.openedAt')}: {formatDate(report.openedAt)}
          </Typography>
          <Typography variant="body2">
            {t('cashbox.zreport.closedAt')}: {formatDate(report.closedAt)}
          </Typography>
          <Typography variant="body2">
            {t('cashbox.openingAmount')}:{' '}
            {formatNumber(report.openingAmount, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography variant="body2">
            {t('cashbox.expected')}:{' '}
            {formatNumber(report.expectedCash, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography variant="body2">
            {t('cashbox.countedAmount')}:{' '}
            {formatNumber(report.countedAmount, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography variant="body2">
            {t('cashbox.variance')}:{' '}
            {formatNumber(report.variance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle2">{t('cashbox.zreport.totals')}</Typography>
        <Stack spacing={0.25} sx={{ mt: 0.5 }}>
          <Typography variant="body2">
            {t('cashbox.salesCashIn')}:{' '}
            {formatNumber(report?.totals?.bySource?.sale || 0, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography variant="body2">
            {t('cashbox.paymentsCashIn')}:{' '}
            {formatNumber(report?.totals?.bySource?.payment || 0, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography variant="body2">
            {t('cashbox.returnsCashOut')}:{' '}
            {formatNumber(report?.totals?.bySource?.return || 0, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography variant="body2">
            {t('cashbox.adjustmentsIn')}:{' '}
            {formatNumber(report?.totals?.bySource?.adjustmentIn || 0, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography variant="body2">
            {t('cashbox.adjustmentsOut')}:{' '}
            {formatNumber(report?.totals?.bySource?.adjustmentOut || 0, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
