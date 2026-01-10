'use client';

import * as React from 'react';
import NumbersIcon from '@mui/icons-material/Numbers';
import type { SvgIconProps } from '@mui/material/SvgIcon';

/**
 * TODO: Replace this with your custom SVG.
 *
 * Keep the `SvgIconProps` signature so color/size works consistently with MUI.
 * You can either:
 * - Replace the returned icon with your own `<SvgIcon>...</SvgIcon>` markup, or
 * - Replace this file entirely with your own implementation.
 */
export default function QtyIcon(props: SvgIconProps) {
  return <NumbersIcon {...props} />;
}

