import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

const loadMoreMock = vi.fn();

vi.mock('../hooks/useChat.js', () => ({
  default: () => ({ messages: [], loadMore: loadMoreMock, hasMore: true, appendMessage: vi.fn() }),
}));
vi.mock('../hooks/useMultiChat.js', () => ({
  default: () => ({ messages: [], loadMore: loadMoreMock, hasMore: true, appendMessage: vi.fn() }),
  globalShardFor: () => 'global#shard-0',
}));
vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn(() => Promise.resolve({})),
  fetchJSONCached: vi.fn(),
}));

import ChatPanel from './ChatPanel.jsx';

beforeEach(() => {
  loadMoreMock.mockClear();
});

describe('ChatPanel component', () => {
  it('renders input field', () => {
    render(<ChatPanel />);
    expect(screen.getByPlaceholderText('Type a message…')).toBeInTheDocument();
  });

  it('hides input on Friends tab', () => {
    render(<ChatPanel />);
    const friendsTab = screen.getByText('Friends');
    fireEvent.click(friendsTab);
    expect(screen.queryByPlaceholderText('Type a message…')).not.toBeInTheDocument();
  });

  it('shows join message when no clan', () => {
    render(<ChatPanel />);
    const clanTab = screen.getByText('Clan');
    fireEvent.click(clanTab);
    expect(screen.getByText('Please join a clan to chat…')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type a message…')).not.toBeInTheDocument();
  });

  it('loads more when scrolled near top', () => {
    render(<ChatPanel />);
    const container = screen.getByTestId('message-scroll');
    fireEvent.scroll(container, { target: { scrollTop: 50 } });
    expect(loadMoreMock).toHaveBeenCalled();
  });
});
