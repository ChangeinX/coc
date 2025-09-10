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

// Mock chat operations
const mockSendMessage = jest.fn().mockResolvedValue({ sendMessage: { id: 'x' } });
jest.mock('@services/graphqlClient', () => ({
  chatOperations: {
    sendMessage: (...args: any[]) => mockSendMessage(...args),
  },
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
});

