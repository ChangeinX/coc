import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../hooks/useAuth.jsx';
import Account from './Account.jsx';

var fetchJSON;
var fetchJSONWithError;

vi.mock('../lib/api.js', () => {
  fetchJSON = vi.fn((path) => {
    if (path === '/user/features') return Promise.resolve({ features: [], all: false });
    return Promise.resolve({});
  });
  fetchJSONWithError = vi.fn(() => Promise.resolve({}));
  return { fetchJSON, fetchJSONWithError };
});

describe('Account logout', () => {
  it('calls backend logout endpoint', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, reload: vi.fn(), hash: '' },
    });

    render(
      <AuthProvider>
        <Account />
      </AuthProvider>
    );

    // wait for profile to load
    await screen.findByText('Profile');

    const button = screen.getByText('Logout');
    await fireEvent.click(button);

    expect(fetchJSONWithError).toHaveBeenCalledWith('/logout', { method: 'POST' });
  });
});
