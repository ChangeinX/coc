import { renderHook, act, waitFor } from '@testing-library/react-native';
import useChat from '../useChat';
import { chatOperations } from '@services/graphqlClient';
import { websocketService } from '@services/websocketClient';
import { messageStorage } from '@services/storage/messageStorage';

jest.mock('@services/graphqlClient');
jest.mock('@services/websocketClient');
jest.mock('@services/storage/messageStorage');

const mockChatOperations = chatOperations as jest.Mocked<typeof chatOperations>;
const mockWebsocketService = websocketService as jest.Mocked<typeof websocketService>;
const mockMessageStorage = messageStorage as jest.Mocked<typeof messageStorage>;

describe('useChat - senderId parameter', () => {
  const chatId = 'chat-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockChatOperations.getMessages.mockResolvedValue({ getMessages: [] });
    mockWebsocketService.subscribeToChat.mockReturnValue(() => {});
    mockWebsocketService.addConnectionHandler.mockImplementation((handler) => {
      // Start disconnected to force outbox path
      handler(false);
      return () => {};
    });
    mockWebsocketService.connect.mockResolvedValue();
    mockMessageStorage.getChatMessages.mockReturnValue([]);
    mockMessageStorage.getOutboxMessages.mockReturnValue([]);
    mockMessageStorage.addOutboxMessage.mockReturnValue();
  });

  it('uses provided senderId for optimistic message', async () => {
    const { result } = renderHook(() => useChat(chatId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage('Hi there', 'user-xyz');
    });

    // Should have added one message with the provided senderId and failed status (offline)
    expect(result.current.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ senderId: 'user-xyz', status: 'failed', content: 'Hi there' }),
      ])
    );
  });
});

