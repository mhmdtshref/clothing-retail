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
