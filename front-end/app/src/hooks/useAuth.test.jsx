import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn(() => Promise.resolve({})),
  fetchJSONWithError: vi.fn(() => Promise.resolve()),
  API_URL: '',
}));

import { AuthProvider, useAuth } from './useAuth.jsx';
import { fetchJSON } from '../lib/api.js';

function Status() {
  const { loading } = useAuth();
  return <div>{loading ? 'loading' : 'done'}</div>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks current user on mount', async () => {
    render(
      <AuthProvider>
        <Status />
      </AuthProvider>
    );
    await screen.findByText('done');
    expect(fetchJSON).toHaveBeenCalledWith('/user/me');
  });
});
