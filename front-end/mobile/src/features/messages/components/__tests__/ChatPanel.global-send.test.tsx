import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChatPanel from '../ChatPanel';
import { ThemeProvider } from '@theme/index';

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock hooks used by ChatPanel
const mockUseMultiChatSend = jest.fn();
jest.mock('@hooks/useMultiChat', () => {
  return {
    __esModule: true,
    globalShardFor: jest.fn(() => 'global#1'),
    default: jest.fn(() => ({
      messages: [],
      hasMore: false,
      isLoading: false,
      isConnected: true,
      error: null,
      loadMore: jest.fn(),
      sendMessage: mockUseMultiChatSend,
      appendMessage: jest.fn(),
      updateMessage: jest.fn(),
      removeMessage: jest.fn(),
      retry: jest.fn(),
    })),
  };
});

jest.mock('@hooks/useChat', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      messages: [],
      hasMore: false,
      isLoading: false,
      isConnected: true,
      error: null,
      loadMore: jest.fn(),
      sendMessage: jest.fn(),
      appendMessage: jest.fn(),
      updateMessage: jest.fn(),
      removeMessage: jest.fn(),
      retry: jest.fn(),
    })),
  };
});

// Mock ModerationError for testing
class MockModerationError extends Error {
  constructor(message: string, public moderationResponse: any) {
    super(message);
    this.name = 'ModerationError';
  }
  get action() { return this.moderationResponse.action; }
  get reason() { return this.moderationResponse.reason; }
  get durationMinutes() { return this.moderationResponse.durationMinutes; }
}

// Mock chat operations
const mockSendMessage = jest.fn().mockResolvedValue({ sendMessage: { id: 'x' } });
jest.mock('@services/graphqlClient', () => ({
  chatOperations: {
    sendMessage: (...args: any[]) => mockSendMessage(...args),
  },
  ModerationError: MockModerationError,
}));

describe('ChatPanel - Global send', () => {
  it('sends messages via chatOperations when in Global tab', async () => {
    const { getByPlaceholderText, getByText } = render(
      <ThemeProvider>
        <ChatPanel
          chatId={null}
          userId="user-123"
          globalIds={['global#1']}
          friendIds={[]}
          initialTab="Global"
        />
      </ThemeProvider>
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Hello world');

    const sendButton = getByText('Send');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('global#1', 'Hello world');
    });

    // Ensure multi-chat hook's sendMessage wasn't used
    expect(mockUseMultiChatSend).not.toHaveBeenCalled();
  });

  it('shows moderation message when message is flagged for toxicity', async () => {
    // Mock ModerationError to be thrown
    mockSendMessage.mockRejectedValueOnce(
      new MockModerationError(
        'Your message was flagged for inappropriate content. Please be respectful in chat.',
        {
          action: 'WARNING',
          reason: 'Your message was flagged for inappropriate content. Please be respectful in chat.',
          durationMinutes: undefined
        }
      )
    );

    const { getByPlaceholderText, getByText, queryByText } = render(
      <ThemeProvider>
        <ChatPanel
          chatId={null}
          userId="user-123"
          globalIds={['global#1']}
          friendIds={[]}
          initialTab="Global"
        />
      </ThemeProvider>
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Toxic message');

    const sendButton = getByText('Send');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(queryByText('Your message was flagged for inappropriate content. Please be respectful in chat.')).toBeTruthy();
    });

    // Text should be cleared for warnings to encourage rephrasing
    expect(input.props.value).toBe('');
  });

  it('restores text for non-warning moderation errors', async () => {
    // Mock ModerationError to be thrown
    mockSendMessage.mockRejectedValueOnce(
      new MockModerationError(
        'You are temporarily muted',
        {
          action: 'MUTED',
          reason: 'You are temporarily muted',
          durationMinutes: 30
        }
      )
    );

    const { getByPlaceholderText, getByText } = render(
      <ThemeProvider>
        <ChatPanel
          chatId={null}
          userId="user-123"
          globalIds={['global#1']}
          friendIds={[]}
          initialTab="Global"
        />
      </ThemeProvider>
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Some message');

    const sendButton = getByText('Send');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(input.props.value).toBe('Some message'); // Text should be restored
    });
  });
});

