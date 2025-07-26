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
vi.mock('../lib/gql.js', () => ({
  graphqlRequest: vi.fn(() =>
    Promise.resolve({ getMessages: [{ content: 'hi', ts: '2025-07-26T00:00:00Z' }] }),
  ),
}));

import FriendsPanel from './FriendsPanel.jsx';

describe('FriendsPanel', () => {
  it('renders friend threads', async () => {
    render(<FriendsPanel onSelectChat={() => {}} />);
    await screen.findByText('Friends');
    const item = await screen.findByRole('listitem');
    expect(item).toHaveClass('thread');
    await screen.findByText('hi');
    expect(item).toHaveTextContent('hi');
  });
});
