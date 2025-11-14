import { ClerkProvider } from '@clerk/nextjs';
import ThemeRegistry from '@/components/ThemeRegistry';
import LayoutShell from '@/components/LayoutShell';
import './globals.scss';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import RegisterSW from '@/components/pwa/RegisterSW';
import { isRtl, normalizeLocale } from '@/lib/i18n/config';

export const metadata = {
  title: process.env.NEXT_PUBLIC_SHOP_NAME || 'Clothing Retail Accountings',
  description: process.env.NEXT_PUBLIC_SHOP_DESCRIPTION || 'Retail accounting for clothing shops',
};

export default function RootLayout({ children }) {
  // Read cookie server-side later if needed; default to English for now
  const locale = normalizeLocale('en');
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1976d2" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <ClerkProvider>
          <I18nProvider locale={locale}>
            <ThemeRegistry>
              <LayoutShell>{children}</LayoutShell>
              <RegisterSW />
            </ThemeRegistry>
          </I18nProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
