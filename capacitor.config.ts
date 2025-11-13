import { CapacitorConfig } from '@capacitor/cli';

const PROD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.example.com';

const config: CapacitorConfig = {
  appId: 'com.clothing.pos',
  appName: 'Clothing POS',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    url: PROD_URL,
    cleartext: true,
  },
};

export default config;


