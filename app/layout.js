import { ClerkProvider } from '@clerk/nextjs';
import ThemeRegistry from '@/components/ThemeRegistry';
import LayoutShell from '@/components/LayoutShell';
import './globals.scss';

export const metadata = {
  title: 'Clothing Retail Accounting',
  description: 'Retail accounting for clothing shops',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1976d2" />
      </head>
      <body>
        <ClerkProvider>
          <ThemeRegistry>
            <LayoutShell>{children}</LayoutShell>
          </ThemeRegistry>
        </ClerkProvider>
      </body>
    </html>
  );
}
