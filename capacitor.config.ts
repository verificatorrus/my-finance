import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myfinance.app',
  appName: 'My Finance',
  webDir: 'dist/client',
  server: {
    // For production, the app will use the Cloudflare Workers API
    // Update this URL to your production Cloudflare Workers domain
    url: 'https://my-finance.pages.dev',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
