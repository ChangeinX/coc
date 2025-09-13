import Constants from 'expo-constants';

type AppExtra = {
  ENV: 'dev' | 'staging' | 'prod' | string;
  API_URL: string;
};

const extra = (Constants?.expoConfig?.extra ?? {}) as Partial<AppExtra>;

export const ENV = (extra.ENV ?? 'dev') as AppExtra['ENV'];
export const API_URL = extra.API_URL ?? 'https://api.dev.clan-boards.com';
