'use client';

import * as React from 'react';
import { Box, Paper, BoxProps } from '@mui/material';

export type ResponsiveActionsBarProps = BoxProps & {
  elevation?: number;
};

export default function ResponsiveActionsBar({ children, elevation = 0, sx, ...rest }: ResponsiveActionsBarProps) {
  return (
    <Box sx={{ px: 2 }}>
      <Paper
        square
        elevation={elevation}
        sx={{
          position: 'sticky',
          bottom: 0,
          zIndex: 1100,
          bgcolor: 'background.paper',
          borderTop: (t) => `1px solid ${t.palette.divider}`,
          px: 2,
          py: 1.5,
          pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          ...sx,
        }}
        {...rest}
      >
        {children}
      </Paper>
    </Box>
  );
}


