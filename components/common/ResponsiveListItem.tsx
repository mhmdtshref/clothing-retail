'use client';

import * as React from 'react';
import { Card, CardContent, CardActions, Stack, Typography, Box, CardProps } from '@mui/material';

export type ResponsiveListItemProps = CardProps & {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  metaStart?: React.ReactNode;
  metaEnd?: React.ReactNode;
  actions?: React.ReactNode;
};

export default function ResponsiveListItem({ title, subtitle, metaStart, metaEnd, actions, children, sx, ...rest }: ResponsiveListItemProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, ...sx }} {...rest}>
      <CardContent sx={{ pb: actions ? 1 : 2 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap title={typeof title === 'string' ? title : undefined}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' } }} noWrap>
                {subtitle}
              </Typography>
            )}
            {children && (
              <Box sx={{ mt: 1 }}>
                {children}
              </Box>
            )}
          </Stack>
          <Stack spacing={0.5} alignItems="flex-end" sx={{ textAlign: 'end', minWidth: 0 }}>
            {metaStart}
            {metaEnd && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {metaEnd}
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
      {actions && (
        <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
          {actions}
        </CardActions>
      )}
    </Card>
  );
}


