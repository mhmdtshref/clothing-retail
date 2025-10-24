import { Paper, Typography, Stack } from '@mui/material';

export default function Home() {
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Clothing Retail Accounting
        </Typography>
        <Typography color="text.secondary">
          MUI v7 theming and layout are configured. Next: DB wiring and models.
        </Typography>
      </Paper>
    </Stack>
  );
}
