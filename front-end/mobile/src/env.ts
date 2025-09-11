import Constants from 'expo-constants';

type AppExtra = {
  ENV: 'dev' | 'staging' | 'prod' | string;
  API_URL: string;
  AUTH_URL: string;
  MESSAGES_URL: string;
};

const extra = (Constants?.expoConfig?.extra ?? {}) as Partial<AppExtra>;

export const ENV = (extra.ENV ?? 'dev') as AppExtra['ENV'];
// Default to dev environment API domains when not explicitly provided
export const API_URL = extra.API_URL ?? 'https://api.dev.clan-boards.com';
export const AUTH_URL = extra.AUTH_URL ?? 'https://api.dev.clan-boards.com';
// Default chat base URL to API_URL when not explicitly provided
export const MESSAGES_URL = extra.MESSAGES_URL ?? API_URL;
