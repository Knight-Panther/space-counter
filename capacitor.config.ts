import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.telo.spacecounter',
  appName: 'Planet Tvale',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
