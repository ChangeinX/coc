import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

const friends = [{ userId: '1', playerTag: '#AAA' }];

vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn(() => Promise.resolve({ sub: '1' })),
  fetchJSONCached: vi.fn((url) => {
    if (url.startsWith('/friends/list')) return Promise.resolve(friends);
    if (url.startsWith('/friends/requests')) return Promise.resolve([]);
    if (url.startsWith('/player/'))
      return Promise.resolve({ name: 'Alice', tag: '#AAA', leagueIcon: '' });
    return Promise.resolve({});
  }),
}));
vi.mock('../lib/gql.js', () => ({ graphqlRequest: vi.fn() }));

import FriendsPanel from './FriendsPanel.jsx';

describe('FriendsPanel', () => {
  beforeEach(() => {
    localStorage.removeItem('friends-view');
  });
  it('toggles row view', async () => {
    render(<FriendsPanel onSelectChat={() => {}} />);
    await screen.findByText('Friends');
    const toggle = screen.getByRole('button', { name: /row view/i });
    fireEvent.click(toggle);
    const container = screen.getByTestId('friends-container');
    expect(container).toHaveClass('overflow-x-auto');
  });

  it('renders friend threads', async () => {
    render(<FriendsPanel onSelectChat={() => {}} />);
    await screen.findByText('Friends');
    const item = await screen.findByRole('button', { name: /chat with/i });
    expect(item.tagName).toBe('LI');
  });
});
