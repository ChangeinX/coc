import { ExpoConfig } from 'expo/config';

const ENV = process.env.APP_ENV || 'dev';

const API_URLS: Record<string, string> = {
  dev: process.env.API_URL_DEV || 'https://api.dev.clan-boards.com',
  staging: process.env.API_URL_STAGING || 'https://staging.api.clanboards.example',
  prod: process.env.API_URL_PROD || 'https://api.clanboards.example',
};

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  name: 'Clan Boards',
  slug: 'clan-boards',
  scheme: 'clanboards',
  version: '0.0.1',
  orientation: 'portrait',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.clan-boards.app-id',
  },
  android: {
    package: 'com.clanboards.app',
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
  plugins: ['expo-apple-authentication', 'expo-asset'],
  extra: {
    ENV,
    API_URL: API_URLS[ENV] || API_URLS.dev,
    eas: {
      projectId: '00000000-0000-0000-0000-000000000000',
    },
  },
});
