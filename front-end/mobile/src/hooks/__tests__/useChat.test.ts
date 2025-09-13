import { renderHook, act, waitFor } from '@testing-library/react-native';
import useChat from '../useChat';
import { chatOperations } from '@services/graphqlClient';
import { websocketService } from '@services/websocketClient';
import { messageStorage } from '@services/storage/messageStorage';

// Mock dependencies
jest.mock('@services/graphqlClient');
jest.mock('@services/websocketClient');
jest.mock('@services/storage/messageStorage');

const mockChatOperations = chatOperations as jest.Mocked<typeof chatOperations>;
const mockWebsocketService = websocketService as jest.Mocked<typeof websocketService>;
const mockMessageStorage = messageStorage as jest.Mocked<typeof messageStorage>;

describe('useChat', () => {
  const chatId = 'test-chat-id';
  const mockMessages = [
    {
      id: '1',
      chatId,
      ts: '2023-01-01T12:00:00Z',
      senderId: 'user1',
      content: 'Hello',
    },
    {
      id: '2',
      chatId,
      ts: '2023-01-01T12:01:00Z',
      senderId: 'user2',
      content: 'Hi there',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockChatOperations.getMessages.mockResolvedValue({
      getMessages: mockMessages,
    });
    
    mockWebsocketService.subscribeToChat.mockReturnValue(() => {});
    mockWebsocketService.addConnectionHandler.mockReturnValue(() => {});
    mockWebsocketService.connect.mockResolvedValue();
    
    mockMessageStorage.getChatMessages.mockReturnValue([]);
    mockMessageStorage.getOutboxMessages.mockReturnValue([]);
  });

  it('initializes with empty messages for null chatId', () => {
    const { result } = renderHook(() => useChat(null));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('loads messages on mount', async () => {
    const { result } = renderHook(() => useChat(chatId));

    // Should start loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockChatOperations.getMessages).toHaveBeenCalledWith(
      chatId,
      undefined,
      20
    );
    expect(result.current.messages).toEqual(mockMessages);
  });

  it('loads cached messages first', async () => {
    const cachedMessages = [mockMessages[0]];
    mockMessageStorage.getChatMessages.mockReturnValue(cachedMessages);

    const { result } = renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    expect(mockMessageStorage.getChatMessages).toHaveBeenCalledWith(chatId);
    // Should initially show cached messages, then replace with fresh ones
  });

  it('sets up WebSocket subscription', async () => {
    renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(mockWebsocketService.connect).toHaveBeenCalled();
      expect(mockWebsocketService.subscribeToChat).toHaveBeenCalledWith(
        chatId,
        expect.any(Function)
      );
      expect(mockWebsocketService.addConnectionHandler).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  it('sends message successfully', async () => {
    mockChatOperations.sendMessage.mockResolvedValue({
      sendMessage: {
        id: 'new-id',
        chatId: 'test-chat',
        ts: '2024-01-01T00:00:00Z',
        senderId: 'user123',
        content: 'test message'
      }
    });
    
    // Set up connection handler mock to immediately call with connected=true
    mockWebsocketService.addConnectionHandler.mockImplementation((handler) => {
      handler(true); // Immediately set as connected
      return () => {};
    });

    const { result } = renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isConnected).toBe(true);
    });

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    expect(mockChatOperations.sendMessage).toHaveBeenCalledWith(
      chatId,
      'Test message'
    );
  });

  it('handles send message error', async () => {
    const error = new Error('Network error');
    mockChatOperations.sendMessage.mockRejectedValue(error);

    const { result } = renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    // Should add message to outbox for retry
    expect(mockMessageStorage.addOutboxMessage).toHaveBeenCalled();
  });

  it('loads more messages', async () => {
    const olderMessages = [
      {
        id: '0',
        chatId,
        ts: '2023-01-01T11:59:00Z',
        senderId: 'user1',
        content: 'Earlier message',
      },
    ];

    mockChatOperations.getMessages
      .mockResolvedValueOnce({ getMessages: mockMessages })
      .mockResolvedValueOnce({ getMessages: olderMessages });

    const { result } = renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.messages.length).toBe(mockMessages.length);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    // Should have called getMessages twice - once for initial load, once for loadMore
    expect(mockChatOperations.getMessages).toHaveBeenCalledTimes(2);
  });

  it('handles WebSocket message', async () => {
    let messageHandler: (message: any) => void;
    
    mockWebsocketService.subscribeToChat.mockImplementation((_, handler) => {
      messageHandler = handler;
      return () => {};
    });

    const { result } = renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newMessage = {
      id: '3',
      chatId,
      ts: '2023-01-01T12:02:00Z',
      senderId: 'user3',
      content: 'New message',
    };

    await act(async () => {
      messageHandler!(newMessage);
    });

    expect(result.current.messages).toContainEqual(newMessage);
  });

  it('appends message to state and cache', async () => {
    const { result } = renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newMessage = {
      id: '3',
      chatId,
      ts: '2023-01-01T12:02:00Z',
      senderId: 'user3',
      content: 'Appended message',
    };

    act(() => {
      result.current.appendMessage(newMessage);
    });

    expect(result.current.messages).toContainEqual(newMessage);
    expect(mockMessageStorage.appendMessage).toHaveBeenCalledWith(chatId, newMessage);
  });

  it('updates message in state and cache', async () => {
    const { result } = renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const messageTs = mockMessages[0].ts;
    const updates = { status: 'failed' as const };

    act(() => {
      result.current.updateMessage(messageTs, updates);
    });

    expect(mockMessageStorage.updateMessage).toHaveBeenCalledWith(
      chatId,
      messageTs,
      updates
    );
  });

  it('removes message from state and cache', async () => {
    const { result } = renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const messageTs = mockMessages[0].ts;

    act(() => {
      result.current.removeMessage(messageTs);
    });

    expect(result.current.messages).not.toContainEqual(
      expect.objectContaining({ ts: messageTs })
    );
    expect(mockMessageStorage.removeMessage).toHaveBeenCalledWith(chatId, messageTs);
  });

  it('handles connection status changes', async () => {
    let connectionHandler: (connected: boolean) => void;
    
    mockWebsocketService.addConnectionHandler.mockImplementation((handler) => {
      connectionHandler = handler;
      return () => {};
    });

    const { result } = renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      connectionHandler!(true);
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      connectionHandler!(false);
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('cleans up subscriptions on unmount', async () => {
    const unsubscribeChat = jest.fn();
    const unsubscribeConnection = jest.fn();

    mockWebsocketService.subscribeToChat.mockReturnValue(unsubscribeChat);
    mockWebsocketService.addConnectionHandler.mockReturnValue(unsubscribeConnection);

    const { unmount } = renderHook(() => useChat(chatId));

    // Wait for initialization to complete
    await waitFor(() => {
      expect(mockWebsocketService.subscribeToChat).toHaveBeenCalled();
    });

    unmount();

    expect(unsubscribeChat).toHaveBeenCalled();
    expect(unsubscribeConnection).toHaveBeenCalled();
  });
});