import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../hooks/useChat.js', () => ({
  default: () => ({ messages: [], loadMore: vi.fn(), hasMore: true, appendMessage: vi.fn() }),
}));
vi.mock('../lib/api.js', () => ({ fetchJSONCached: vi.fn() }));
vi.mock('../lib/gql.js', () => ({ graphqlRequest: vi.fn() }));
vi.mock('../lib/db.js', () => ({ addOutboxMessage: vi.fn() }));

import DirectChatDrawer from './DirectChatDrawer.jsx';

describe('DirectChatDrawer', () => {
  it('renders input when open', () => {
    render(<DirectChatDrawer chatId="c" userId="u" open onClose={() => {}} />);
    expect(screen.getByPlaceholderText('Type a message…')).toBeInTheDocument();
  });
});
