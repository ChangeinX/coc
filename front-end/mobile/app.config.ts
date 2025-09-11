import { ExpoConfig } from 'expo/config';

const ENV = process.env.APP_ENV || 'dev';

const API_URLS: Record<string, string> = {
  dev: process.env.API_URL_DEV || 'https://api.dev.clan-boards.com',
  staging: process.env.API_URL_STAGING || 'https://staging.api.clanboards.example',
  prod: process.env.API_URL_PROD || 'https://api.clanboards.example',
};

const AUTH_URLS: Record<string, string> = {
  dev: process.env.AUTH_URL_DEV || 'https://api.dev.clan-boards.com',
  staging: process.env.AUTH_URL_STAGING || 'https://staging.users.clanboards.example',
  prod: process.env.AUTH_URL_PROD || 'https://users.clanboards.example',
};

// Messages base URL per environment. Defaults to API_URL for each env.
const MESSAGES_URLS: Record<string, string> = {
  dev: process.env.MESSAGES_URL_DEV || API_URLS.dev,
  staging: process.env.MESSAGES_URL_STAGING || API_URLS.staging,
  prod: process.env.MESSAGES_URL_PROD || API_URLS.prod,
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
  extra: {
    ENV,
    API_URL: API_URLS[ENV] || API_URLS.dev,
    AUTH_URL: AUTH_URLS[ENV] || AUTH_URLS.dev,
    MESSAGES_URL: MESSAGES_URLS[ENV] || MESSAGES_URLS.dev,
    eas: {
      projectId: '00000000-0000-0000-0000-000000000000',
    },
  },
});
