export const metadata = {
  title: 'Clothing Retail Accounting',
  description: 'Retail accounting for clothing shops',
};
import './globals.scss';
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
