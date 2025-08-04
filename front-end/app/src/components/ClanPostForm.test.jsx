import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: () => ({ user: { player_tag: 'PLAYER1' } }),
}));

vi.mock('../hooks/useCachedIcon.js', () => ({
  default: (src) => src,
}));

vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn((url) => {
    if (url.startsWith('/player/')) {
      return Promise.resolve({ clanTag: 'CLAN1' });
    }
    if (url.startsWith('/clan/')) {
      return Promise.resolve({ tag: 'CLAN1', name: 'My Clan', labels: [], badgeUrls: {} });
    }
    return Promise.resolve({});
  }),
  API_URL: '',
}));

import ClanPostForm from './ClanPostForm.jsx';

test('renders clan preview', async () => {
  render(<ClanPostForm />, { legacyRoot: true });
  expect(await screen.findByText('My Clan')).toBeInTheDocument();
});
