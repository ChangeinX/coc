import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { AuthProvider } from './hooks/useAuth.jsx';
import App from './App.jsx';

describe('App authentication', () => {
  it('shows login page when not authenticated', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve(''), json: () => Promise.resolve({}) })));
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(await screen.findByText(/login or register/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
