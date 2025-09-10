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

// Basic clipboard mock for tests using expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
  setString: jest.fn(() => {}),
  getStringAsync: jest.fn(async () => ''),
  hasStringAsync: jest.fn(async () => false),
  isPasteButtonAvailable: false,
  ClipboardPasteButton: () => null,
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const MockView = (props) => props.children;
  const MockTouchable = (props) => props.children;
  
  return {
    GestureHandlerRootView: MockView,
    PanGestureHandler: MockView,
    TapGestureHandler: MockView,
    NativeViewGestureHandler: MockView,
    FlingGestureHandler: MockView,
    ForceTouchGestureHandler: MockView,
    LongPressGestureHandler: MockView,
    PinchGestureHandler: MockView,
    RotationGestureHandler: MockView,
    RawButton: MockTouchable,
    BaseButton: MockTouchable,
    RectButton: MockTouchable,
    BorderlessButton: MockTouchable,
    State: {
      UNDETERMINED: 0,
      FAILED: 1,
      BEGAN: 2,
      CANCELLED: 3,
      ACTIVE: 4,
      END: 5,
    },
    Directions: {
      RIGHT: 1,
      LEFT: 2,
      UP: 4,
      DOWN: 8,
    },
  };
});

// Mock React Native core modules that cause issues in tests
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  // Mock PixelRatio
  RN.PixelRatio = {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((layoutSize) => Math.round(layoutSize * 2)),
    roundToNearestPixel: jest.fn((layoutSize) => Math.round(layoutSize * 2) / 2),
  };

  // Mock DevMenu
  RN.DevMenu = {
    addItem: jest.fn(),
    reload: jest.fn(),
  };

  // Track listeners for cleanup
  const keyboardListeners = [];
  const dimensionListeners = [];
  
  // Mock Keyboard
  RN.Keyboard = {
    addListener: jest.fn((eventName, callback) => {
      const listener = { eventName, callback, remove: jest.fn() };
      keyboardListeners.push(listener);
      return listener;
    }),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(() => {
      keyboardListeners.length = 0;
    }),
    dismiss: jest.fn(),
  };

  // Mock Dimensions
  RN.Dimensions = {
    get: jest.fn(() => ({ width: 375, height: 667 })),
    addEventListener: jest.fn((eventName, callback) => {
      const listener = { eventName, callback, remove: jest.fn() };
      dimensionListeners.push(listener);
      return listener;
    }),
    removeEventListener: jest.fn(),
  };

  return RN;
});

// Mock networking
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Global cleanup to prevent async leaks
afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();
  jest.useRealTimers();
  
  // Clear all mocks but not restore (preserve setup mocks)
  jest.clearAllMocks();
  
  // Reset fetch mock if it was modified
  if (global.fetch) {
    global.fetch.mockClear();
  }
});

afterAll(() => {
  // Clean up any remaining timers
  jest.clearAllTimers();
  jest.useRealTimers();
  
  // Restore all mocks
  jest.restoreAllMocks();
});
