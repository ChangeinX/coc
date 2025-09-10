import { useEffect, useState, useCallback, useRef } from 'react';
import { chatOperations } from '@services/graphqlClient';
import { websocketService, ChatMessage } from '@services/websocketClient';
import { messageStorage } from '@services/storage/messageStorage';
import { UseChatReturn } from './useChat';

const PAGE_SIZE = 20;

// Function to determine which global shard a user should connect to
export function globalShardFor(userId?: string | null): string {
  // Match server naming and shard count
  const shardCount = 20;
  if (!userId || typeof userId !== 'string') return 'global#shard-0';

  // Java String.hashCode equivalent for consistency with backend
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (Math.imul(31, h) + userId.charCodeAt(i)) | 0;
  }
  const shardId = ((h % shardCount) + shardCount) % shardCount;
  return `global#shard-${shardId}`;
}

export default function useMultiChat(chatIds: string[]): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const unsubscribesRef = useRef<Map<string, () => void>>(new Map());
  const connectionUnsubscribeRef = useRef<(() => void) | null>(null);

  // Handle incoming WebSocket messages from any subscribed chat
  const handleMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      // Avoid duplicates
      const exists = prev.some(m => 
        m.ts === message.ts && 
        m.senderId === message.senderId &&
        m.chatId === message.chatId
      );
      if (exists) return prev;
      
      const updated = [...prev, message].sort((a, b) => 
        new Date(a.ts).getTime() - new Date(b.ts).getTime()
      );
      
      // Cache the message
      messageStorage.appendMessage(message.chatId, message);
      
      return updated;
    });
  }, []);

  // Handle connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    
    if (connected && chatIds.length > 0) {
      // Connection restored, flush outbox for all chats
      flushOutbox();
    }
  }, [chatIds.length]);

  // Flush pending messages from outbox for all chats
  const flushOutbox = useCallback(async () => {
    if (!isConnected || chatIds.length === 0) return;

    for (const chatId of chatIds) {
      const outboxMessages = messageStorage.getOutboxMessages(chatId);
      
      for (const outboxMessage of outboxMessages) {
        try {
          await chatOperations.sendMessage(chatId, outboxMessage.content);
          messageStorage.removeOutboxMessage(outboxMessage.id);
          
          // Remove the local "sending" message
          setMessages(prev => prev.filter(m => m.ts !== outboxMessage.ts));
        } catch (error) {
          console.error('Failed to send outbox message:', error);
          
          // Increment retry count
          messageStorage.updateOutboxMessage(outboxMessage.id, {
            retryCount: outboxMessage.retryCount + 1,
            lastAttempt: new Date().toISOString(),
          });
          
          break; // Stop processing on error
        }
      }
    }
  }, [chatIds, isConnected]);

  // Load messages from all chats
  useEffect(() => {
    if (chatIds.length === 0) {
      setMessages([]);
      setIsInitialized(false);
      return;
    }

    let isCancelled = false;

    const setup = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load cached messages from all chats
        const allCachedMessages: ChatMessage[] = [];
        for (const chatId of chatIds) {
          const cached = messageStorage.getChatMessages(chatId);
          allCachedMessages.push(...cached);
        }

        if (allCachedMessages.length > 0 && !isCancelled) {
          const sortedCached = allCachedMessages.sort((a, b) => 
            new Date(a.ts).getTime() - new Date(b.ts).getTime()
          );
          setMessages(sortedCached);
          setHasMore(sortedCached.length >= PAGE_SIZE);
        }

        // Load fresh messages from all chats
        const allFreshMessages: ChatMessage[] = [];
        const messagePromises = chatIds.map(chatId => 
          chatOperations.getMessages(chatId, undefined, PAGE_SIZE)
            .then(response => ({ chatId, messages: response.getMessages || [] }))
            .catch(error => ({ chatId, messages: [], error }))
        );

        const results = await Promise.all(messagePromises);

        for (const result of results) {
          if ('error' in result) {
            console.error(`Error loading messages for chat ${result.chatId}:`, result.error);
            continue;
          }
          allFreshMessages.push(...result.messages);
          // Cache the fresh messages
          messageStorage.setChatMessages(result.chatId, result.messages);
        }

        if (!isCancelled) {
          const sortedFresh = allFreshMessages.sort((a, b) => 
            new Date(a.ts).getTime() - new Date(b.ts).getTime()
          );
          setMessages(sortedFresh);
          setHasMore(sortedFresh.length >= PAGE_SIZE);
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
          setError(errorMessage);
          console.error('Error loading multi-chat history:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    setup();

    return () => {
      isCancelled = true;
    };
  }, [chatIds]);

  // Set up WebSocket subscriptions for all chats
  useEffect(() => {
    if (chatIds.length === 0 || !isInitialized) return;

    // Subscribe to WebSocket connection status
    connectionUnsubscribeRef.current = websocketService.addConnectionHandler(handleConnectionChange);

    // Connect to WebSocket if not already connected
    websocketService.connect();

    // Subscribe to all chat messages
    const newUnsubscribes = new Map<string, () => void>();
    
    for (const chatId of chatIds) {
      const unsubscribe = websocketService.subscribeToChat(chatId, handleMessage);
      newUnsubscribes.set(chatId, unsubscribe);
    }

    // Unsubscribe from chats that are no longer needed
    for (const [oldChatId, unsubscribe] of unsubscribesRef.current) {
      if (!chatIds.includes(oldChatId)) {
        unsubscribe();
      }
    }

    unsubscribesRef.current = newUnsubscribes;

    return () => {
      for (const unsubscribe of newUnsubscribes.values()) {
        unsubscribe();
      }
      if (connectionUnsubscribeRef.current) {
        connectionUnsubscribeRef.current();
        connectionUnsubscribeRef.current = null;
      }
    };
  }, [chatIds, isInitialized, handleMessage, handleConnectionChange]);

  // Load more messages (not really applicable for multi-chat, but kept for interface compatibility)
  const loadMore = useCallback(async () => {
    if (chatIds.length === 0 || !hasMore || isLoading || messages.length === 0) return;

    setIsLoading(true);
    try {
      const oldestMessage = messages[0];
      const allOlderMessages: ChatMessage[] = [];
      
      // Load older messages from each chat
      const loadPromises = chatIds.map(async (chatId) => {
        try {
          const response = await chatOperations.getMessages(
            chatId,
            oldestMessage.ts,
            PAGE_SIZE
          );
          return response.getMessages || [];
        } catch (error) {
          console.error(`Error loading more messages for chat ${chatId}:`, error);
          return [];
        }
      });

      const results = await Promise.all(loadPromises);
      results.forEach(result => allOlderMessages.push(...result));
      
      const sortedOlder = allOlderMessages.sort((a, b) => 
        new Date(a.ts).getTime() - new Date(b.ts).getTime()
      );
      
      setMessages(prev => [...sortedOlder, ...prev]);
      setHasMore(allOlderMessages.length >= PAGE_SIZE);
      
      // Update cache with new messages for each chat
      const messagesByChatId = new Map<string, ChatMessage[]>();
      [...sortedOlder, ...messages].forEach(msg => {
        if (!messagesByChatId.has(msg.chatId)) {
          messagesByChatId.set(msg.chatId, []);
        }
        messagesByChatId.get(msg.chatId)!.push(msg);
      });

      for (const [chatId, chatMessages] of messagesByChatId) {
        messageStorage.setChatMessages(chatId, chatMessages);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more messages';
      setError(errorMessage);
      console.error('Error loading more multi-chat messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chatIds, hasMore, isLoading, messages]);

  // Send message is not applicable for multi-chat (user needs to specify which chat)
  const sendMessage = useCallback(async (_content: string, _senderId?: string) => {
    throw new Error('Cannot send message in multi-chat mode. Use specific chat ID.');
  }, []);

  // Message manipulation functions (limited for multi-chat)
  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const exists = prev.some(m => 
        m.ts === message.ts && 
        m.senderId === message.senderId &&
        m.chatId === message.chatId
      );
      if (exists) return prev;
      
      const updated = [...prev, message].sort((a, b) => 
        new Date(a.ts).getTime() - new Date(b.ts).getTime()
      );
      
      messageStorage.appendMessage(message.chatId, message);
      return updated;
    });
  }, []);

  const updateMessage = useCallback((messageTs: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => {
      const updated = prev.map(msg => 
        msg.ts === messageTs ? { ...msg, ...updates } : msg
      );
      
      // Update in cache for the affected chat
      const affectedMessage = prev.find(m => m.ts === messageTs);
      if (affectedMessage) {
        messageStorage.updateMessage(affectedMessage.chatId, messageTs, updates);
      }
      
      return updated;
    });
  }, []);

  const removeMessage = useCallback((messageTs: string) => {
    setMessages(prev => {
      const messageToRemove = prev.find(m => m.ts === messageTs);
      const filtered = prev.filter(msg => msg.ts !== messageTs);
      
      // Remove from cache
      if (messageToRemove) {
        messageStorage.removeMessage(messageToRemove.chatId, messageTs);
      }
      
      return filtered;
    });
  }, []);

  // Retry failed operations
  const retry = useCallback(() => {
    setError(null);
    if (chatIds.length > 0 && isConnected) {
      flushOutbox();
    }
  }, [chatIds.length, isConnected, flushOutbox]);

  return {
    messages,
    hasMore,
    isLoading,
    isConnected,
    error,
    loadMore,
    sendMessage,
    appendMessage,
    updateMessage,
    removeMessage,
    retry,
  };
}
