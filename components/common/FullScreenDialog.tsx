'use client';

import * as React from 'react';
import { Dialog, DialogProps, useMediaQuery, useTheme } from '@mui/material';

export type FullScreenDialogProps = DialogProps & {
  forceFullScreen?: boolean;
};

export default function FullScreenDialog({ forceFullScreen, ...props }: FullScreenDialogProps) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const fullScreen = forceFullScreen ?? isXs;
  return <Dialog fullScreen={fullScreen} {...props} />;
}
