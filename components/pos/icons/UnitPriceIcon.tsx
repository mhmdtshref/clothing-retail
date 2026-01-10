'use client';

import * as React from 'react';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import type { SvgIconProps } from '@mui/material/SvgIcon';

/**
 * TODO: Replace this with your custom SVG.
 *
 * Keep the `SvgIconProps` signature so color/size works consistently with MUI.
 * You can either:
 * - Replace the returned icon with your own `<SvgIcon>...</SvgIcon>` markup, or
 * - Replace this file entirely with your own implementation.
 */
export default function UnitPriceIcon(props: SvgIconProps) {
  return <AttachMoneyIcon {...props} />;
}

