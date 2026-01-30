import { createTheme, responsiveFontSizes } from '@mui/material/styles';

/**
 * Build the application theme with optional direction.
 * Includes responsive typography and tuned component defaults.
 */
export default function createAppTheme(direction = 'ltr') {
  const base = createTheme({
    direction,
    palette: {
      mode: 'light',
      primary: { main: '#111827' }, // slate-900
      secondary: { main: '#6b7280' }, // gray-500
      background: { default: '#fafafa', paper: '#ffffff' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontSize: 14,
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: { defaultProps: { variant: 'contained' } },
      MuiContainer: {
        defaultProps: {
          disableGutters: true,
        },
      },
      MuiDialog: {
        defaultProps: {
          fullWidth: true,
          maxWidth: 'sm',
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { minWidth: 44, minHeight: 44 },
        },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: { minHeight: 44 },
        },
      },
    },
  });
  return responsiveFontSizes(base);
}
