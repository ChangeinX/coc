import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

const loadMoreMock = vi.fn();
const appendMessageMock = vi.fn();
const removeMessageMock = vi.fn();

vi.mock('../hooks/useChat.js', () => ({
  default: () => ({
    messages: [],
    loadMore: loadMoreMock,
    hasMore: true,
    appendMessage: appendMessageMock,
    removeMessage: removeMessageMock,
    updateMessage: vi.fn(),
  }),
}));
vi.mock('../hooks/useMultiChat.js', () => ({
  default: () => ({
    messages: [],
    loadMore: loadMoreMock,
    hasMore: true,
    appendMessage: appendMessageMock,
    removeMessage: removeMessageMock,
    updateMessage: vi.fn(),
  }),
  globalShardFor: () => 'global#shard-0',
}));
vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn(() => Promise.resolve({})),
  fetchJSONCached: vi.fn(),
}));
vi.mock('../lib/gql.js', () => ({
  graphqlRequest: vi.fn(),
}));

import ChatPanel from './ChatPanel.jsx';
import { graphqlRequest } from '../lib/gql.js';

beforeEach(() => {
  loadMoreMock.mockClear();
  appendMessageMock.mockClear();
  removeMessageMock.mockClear();
  graphqlRequest.mockReset();
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

  it('uses initialTab when provided', () => {
    render(<ChatPanel initialTab="Friends" />);
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

  it('shows restriction message instead of input', () => {
    render(<ChatPanel restriction={{ status: 'BANNED', remaining: 0 }} />);
    expect(screen.getByText('You are banned from chat.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type a message…')).not.toBeInTheDocument();
  });

  it('alerts and removes message when moderation fails', async () => {
    graphqlRequest.mockRejectedValueOnce(new Error('TOXICITY_WARNING'));
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ChatPanel chatId="1" userId="u1" />);
    fireEvent.change(screen.getByPlaceholderText('Type a message…'), {
      target: { value: 'bad' },
    });
    fireEvent.click(screen.getAllByText('Send')[0]);
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Keep it civil'));
    expect(removeMessageMock).toHaveBeenCalled();
    alertMock.mockRestore();
  });
});
