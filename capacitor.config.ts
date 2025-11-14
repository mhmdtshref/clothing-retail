import { CapacitorConfig } from '@capacitor/cli';

const PROD_URL = process.env.NEXT_PUBLIC_APP_URL;

const config: CapacitorConfig = {
  appId: 'ai.imenu.lariche',
  appName: 'Lariche Boutique POS',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    url: PROD_URL,
    cleartext: true,
  },
};

export default config;
