import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lifevault.app',
  appName: 'LifeVault',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#0f172a',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
  },
};

export default config;
