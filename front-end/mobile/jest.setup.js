// Mocks for native modules used in foundations
jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    MMKV: function MMKV() {
      return {
        set: (k, v) => store.set(k, v),
        getString: (k) => (store.has(k) ? String(store.get(k)) : undefined),
        getNumber: (k) => (store.has(k) ? Number(store.get(k)) : undefined),
        getBoolean: (k) => (store.has(k) ? Boolean(store.get(k)) : undefined),
        delete: (k) => store.delete(k),
      };
    },
  };
});

jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: async (k) => store.get(k) ?? null,
    setItemAsync: async (k, v) => { store.set(k, v); },
    deleteItemAsync: async (k) => { store.delete(k); },
    AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  };
});

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      ENV: 'dev',
      API_URL: 'http://localhost:5000',
    },
  },
}));
