import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#111827' }, // slate-900
    secondary: { main: '#6b7280' }, // gray-500
    background: { default: '#fafafa', paper: '#ffffff' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { variant: 'contained' } },
  },
});

export default theme;
