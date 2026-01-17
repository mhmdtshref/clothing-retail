import { CapacitorConfig } from '@capacitor/cli';

const PROD_URL = process.env.NEXT_PUBLIC_APP_URL;

const config: CapacitorConfig = {
  appId: '[APP_ID_HERE-ex: com.example.app]',
  appName: 'APP_NAME_HERE',
  webDir: 'out',
  server: {
    url: PROD_URL,
    cleartext: true,
  },
};

export default config;
