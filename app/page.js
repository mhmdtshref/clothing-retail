import { Paper, Typography, Stack } from '@mui/material';

export default function Home() {
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {process.env.NEXT_PUBLIC_SHOP_NAME || 'Clothing Retail Accountings'}
        </Typography>
        <Typography color="text.secondary">
          {process.env.NEXT_PUBLIC_SHOP_DESCRIPTION || 'Retail accounting for clothing shops'}
        </Typography>
      </Paper>
    </Stack>
  );
}
