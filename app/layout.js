import { ClerkProvider } from '@clerk/nextjs';
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
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
