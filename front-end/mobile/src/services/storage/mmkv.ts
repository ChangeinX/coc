import { MMKV as RNMMKV } from 'react-native-mmkv';

export const MMKV = new RNMMKV({ id: 'clan-boards' });

export const Storage = {
  set: (key: string, value: string) => MMKV.set(key, value),
  getString: (key: string) => MMKV.getString(key),
  getNumber: (key: string) => MMKV.getNumber(key),
  getBoolean: (key: string) => MMKV.getBoolean(key),
  delete: (key: string) => MMKV.delete(key),
};
