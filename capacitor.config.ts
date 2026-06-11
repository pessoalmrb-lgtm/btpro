import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beachpro.app',
  appName: 'BeachPró',
  webDir: 'out',
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a1628',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#0a1628',
      showSpinner: false,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '931735521781-6bdlejsqic1l4lt7odfl5p7h44pkv7jo.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  }
};

export default config;
