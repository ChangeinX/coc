import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ChatMessage from '../ChatMessage';
import { ChatMessage as ChatMessageType } from '@services/websocketClient';

// Mock the theme hook
jest.mock('@theme/index', () => ({
  useTheme: () => ({
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      primary: '#007AFF',
      surface: '#FFFFFF',
      border: '#E5E5E5',
    },
    typography: {},
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ChatMessage', () => {
  const mockMessage: ChatMessageType = {
    chatId: 'test-chat',
    ts: '2023-01-01T12:00:00Z',
    senderId: 'user123',
    content: 'Hello world!',
    status: 'sent',
  };

  const mockInfo = {
    name: 'Test User',
    tag: '#ABC123',
    icon: 'https://example.com/icon.png',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders message correctly', () => {
    const { getByText } = render(
      <ChatMessage
        message={mockMessage}
        info={mockInfo}
        isSelf={false}
      />
    );

    expect(getByText('Hello world!')).toBeTruthy();
    expect(getByText('Test User')).toBeTruthy();
    expect(getByText('#ABC123')).toBeTruthy();
  });

  it('renders self message differently', () => {
    const { queryByText, getByText } = render(
      <ChatMessage
        message={mockMessage}
        info={mockInfo}
        isSelf={true}
      />
    );

    // Self messages don't show sender name/tag
    expect(queryByText('Test User')).toBeFalsy();
    expect(queryByText('#ABC123')).toBeFalsy();
    expect(getByText('Hello world!')).toBeTruthy();
  });

  it('shows retry dialog for failed messages', () => {
    const mockRetry = jest.fn();
    const failedMessage = { ...mockMessage, status: 'failed' as const };

    const { getByText } = render(
      <ChatMessage
        message={failedMessage}
        info={mockInfo}
        isSelf={true}
        onRetry={mockRetry}
      />
    );

    const messageElement = getByText('Hello world!');
    // Parent is the pressable bubble wrapper
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent.press((messageElement.parent) as any);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Retry Message',
      'Would you like to retry sending this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: mockRetry },
      ]
    );
  });

  it('renders mentions correctly', () => {
    const messageWithMention = {
      ...mockMessage,
      content: 'Hello @[John](#TAG123), how are you?',
    };

    const { getByText } = render(
      <ChatMessage
        message={messageWithMention}
        info={mockInfo}
        isSelf={false}
      />
    );

    expect(getByText('Hello ')).toBeTruthy();
    expect(getByText('@John')).toBeTruthy();
    expect(getByText(', how are you?')).toBeTruthy();
  });

  it('shows status icons for different message states', () => {
    const sendingMessage = { ...mockMessage, status: 'sending' as const };
    const { getByText: getSendingText } = render(
      <ChatMessage
        message={sendingMessage}
        info={mockInfo}
        isSelf={true}
      />
    );
    expect(getSendingText('⏳')).toBeTruthy();

    const failedMessage = { ...mockMessage, status: 'failed' as const };
    const { getByText: getFailedText } = render(
      <ChatMessage
        message={failedMessage}
        info={mockInfo}
        isSelf={true}
      />
    );
    expect(getFailedText('❌')).toBeTruthy();
  });

  it('formats timestamp correctly', () => {
    const messageWithTime = {
      ...mockMessage,
      ts: '2023-01-01T15:30:00Z',
    };

    const { getByText } = render(
      <ChatMessage
        message={messageWithTime}
        info={mockInfo}
        isSelf={false}
      />
    );

    // Should show time in HH:MM format (dependent on locale)
    expect(getByText(/\d{2}:\d{2}/)).toBeTruthy();
  });

  it('shows default avatar when no icon provided', () => {
    const { icon: _omit, ...infoWithoutIcon } = mockInfo;

    const { getByText } = render(
      <ChatMessage
        message={mockMessage}
        info={infoWithoutIcon}
        isSelf={false}
      />
    );

    // Should show first letter of name as avatar
    expect(getByText('T')).toBeTruthy();
  });

  it('handles long press with default options', () => {
    const { getByText } = render(
      <ChatMessage
        message={mockMessage}
        info={mockInfo}
        isSelf={false}
      />
    );

    const messageElement = getByText('Hello world!');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent((messageElement.parent) as any, 'onLongPress');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Message Options',
      'Hello world!',
      [
        { text: 'Copy', onPress: expect.any(Function) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  });

  it('calls custom onLongPress when provided', () => {
    const mockLongPress = jest.fn();

    const { getByText } = render(
      <ChatMessage
        message={mockMessage}
        info={mockInfo}
        isSelf={false}
        onLongPress={mockLongPress}
      />
    );

    const messageElement = getByText('Hello world!');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent((messageElement.parent) as any, 'onLongPress');

    expect(mockLongPress).toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
