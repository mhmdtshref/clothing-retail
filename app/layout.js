import ThemeRegistry from '@/components/ThemeRegistry';
import LayoutShell from '@/components/LayoutShell';
import './globals.scss';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import RegisterSW from '@/components/pwa/RegisterSW';
import { isRtl, normalizeLocale } from '@/lib/i18n/config';
import { cookies } from 'next/headers';

export const metadata = {
  title: process.env.NEXT_PUBLIC_SHOP_NAME || 'Clothing Retail Accountings',
  description: process.env.NEXT_PUBLIC_SHOP_DESCRIPTION || 'Retail accounting for clothing shops',
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('lang')?.value || 'en');
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1976d2" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* iOS PWA / Home Screen icon & meta */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="apple-mobile-web-app-title"
          content={process.env.NEXT_PUBLIC_SHOP_NAME || 'Clothing Shop POS'}
        />
        <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <ThemeRegistry>
            <LayoutShell>{children}</LayoutShell>
            <RegisterSW />
          </ThemeRegistry>
        </I18nProvider>
      </body>
    </html>
  );
}
