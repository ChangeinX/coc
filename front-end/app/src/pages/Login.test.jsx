import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

var loginMock = vi.fn();
var fetchJSONMock;

vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    login: (...args) => loginMock(...args),
  }),
}));

vi.mock('../lib/api.js', () => {
  fetchJSONMock = vi.fn();
  const fetchJSON = (...args) => fetchJSONMock(...args);
  return { fetchJSON };
});

import Login from './Login.jsx';

describe('Login redirect', () => {
  beforeEach(() => {
    loginMock.mockReset();
    fetchJSONMock.mockReset();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, hash: '', reload: vi.fn() },
    });
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn((opts) => {
            window.__loginCallback = opts.callback;
          }),
          renderButton: vi.fn(),
          prompt: vi.fn(),
        },
      },
    };
  });

  it('navigates to banned page when account is banned', async () => {
    loginMock.mockResolvedValue({ sub: 'u1' });
    fetchJSONMock.mockResolvedValue({ status: 'BANNED', remaining: 0 });

    render(<Login />);
    await window.__loginCallback({ credential: 'tok' });

    expect(window.location.hash).toBe('#/banned');
  });
});
