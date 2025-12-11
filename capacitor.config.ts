import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myfinance.app',
  appName: 'My Finance',
  webDir: 'dist/client',
  server: {
    // For production, the app will use the Cloudflare Workers API
    // Update this URL to your production Cloudflare Workers domain
    // url: 'my-finance.quicpro.workers.dev', // Production
    url: 'my-finance-dev.quicpro.workers.dev',  // Development
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
