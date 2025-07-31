import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// mocks must be defined before importing the component
const logoutSpy = vi.fn();
var restrictionsMock = vi.fn(() => null);
let currentUser = null;

vi.mock('./hooks/useRestrictions.js', () => ({
  default: (...args) => restrictionsMock(...args),
}));

vi.mock('./hooks/useAuth.jsx', () => {
  return {
    AuthProvider: ({ children }) => <>{children}</>,
    useAuth: () => ({
      user: currentUser,
      logout: () => {
        logoutSpy();
        currentUser = null;
      },
      loading: false,
    }),
  };
});

import App from './App.jsx';

describe('App authentication', () => {
  beforeEach(() => {
    restrictionsMock.mockReset();
    logoutSpy.mockClear();
    currentUser = null;
  });
  it('shows login page when not authenticated', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve(''), json: () => Promise.resolve({}) })));
    currentUser = null;
    render(
      <App />
    );
    expect(await screen.findByText(/login or register/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('shows banned page when hash is set', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, hash: '#/banned' },
    });
    currentUser = null;
    render(<App />);
    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
  });

  it('logs out and redirects when restrictions report a ban', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, hash: '' },
    });
    currentUser = { sub: 'u1', id: 1, name: 'Test' };
    restrictionsMock.mockReturnValue({ status: 'BANNED', remaining: 0 });
    render(<App />);
    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    expect(logoutSpy).toHaveBeenCalled();
    expect(window.location.hash).toBe('#/banned');
  });
});
