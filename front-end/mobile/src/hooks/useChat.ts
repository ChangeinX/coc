import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { chatOperations, GraphQLError } from '@services/graphqlClient';
import { websocketService, ChatMessage } from '@services/websocketClient';
import { messageStorage } from '@services/storage/messageStorage';

const PAGE_SIZE = 20;

export interface UseChatReturn {
  messages: ChatMessage[];
  hasMore: boolean;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  sendMessage: (content: string, senderId?: string) => Promise<void>;
  appendMessage: (message: ChatMessage) => void;
  updateMessage: (messageTs: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (messageTs: string) => void;
  retry: () => void;
}

export default function useChat(chatId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const connectionUnsubscribeRef = useRef<(() => void) | null>(null);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      // Avoid duplicates
      const exists = prev.some(m => m.ts === message.ts && m.senderId === message.senderId);
      if (exists) return prev;
      
      const updated = [...prev, message];
      
      // Cache the message
      if (chatId) {
        messageStorage.appendMessage(chatId, message);
      }
      
      return updated;
    });
  }, [chatId]);

  // Handle connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    
    if (connected && chatId) {
      // Connection restored, flush outbox
      flushOutbox();
    }
  }, [chatId]);

  // Flush pending messages from outbox
  const flushOutbox = useCallback(async () => {
    if (!chatId || !isConnected) return;

    const outboxMessages = messageStorage.getOutboxMessages(chatId);
    
    for (const outboxMessage of outboxMessages) {
      try {
        await chatOperations.sendMessage(chatId, outboxMessage.content);
        messageStorage.removeOutboxMessage(outboxMessage.id);
        
        // Remove the local "sending" message
        setMessages(prev => prev.filter(m => m.ts !== outboxMessage.ts));
      } catch (error) {
        console.error('Failed to send outbox message:', error);
        
        if (error instanceof GraphQLError) {
          if (error.isToxicityWarning || error.isBanned || error.isMuted) {
            // Remove message that can't be sent
            messageStorage.removeOutboxMessage(outboxMessage.id);
            setMessages(prev => prev.filter(m => m.ts !== outboxMessage.ts));
          } else {
            // Increment retry count
            messageStorage.updateOutboxMessage(outboxMessage.id, {
              retryCount: outboxMessage.retryCount + 1,
              lastAttempt: new Date().toISOString(),
            });
            
            // Mark as failed in UI
            setMessages(prev => prev.map(m => 
              m.ts === outboxMessage.ts ? { ...m, status: 'failed' } : m
            ));
          }
        }
        
        break; // Stop processing on error
      }
    }
  }, [chatId, isConnected]);

  // Load initial data and set up subscriptions
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setIsInitialized(false);
      return;
    }

    let isCancelled = false;

    const setup = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load cached messages first
        const cached = messageStorage.getChatMessages(chatId);
        if (cached.length > 0 && !isCancelled) {
          setMessages(cached);
          setHasMore(cached.length >= PAGE_SIZE);
        }

        // Load fresh messages from server
        const response = await chatOperations.getMessages(chatId, undefined, PAGE_SIZE);
        
        if (!isCancelled) {
          const freshMessages = response.getMessages || [];
          setMessages(freshMessages);
          setHasMore(freshMessages.length === PAGE_SIZE);
          
          // Cache the fresh messages
          messageStorage.setChatMessages(chatId, freshMessages);
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
          setError(errorMessage);
          console.error('Error loading chat history:', err);
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
  }, [chatId]);

  // Set up WebSocket subscriptions
  useEffect(() => {
    if (!chatId || !isInitialized) return;

    // Subscribe to WebSocket connection status
    connectionUnsubscribeRef.current = websocketService.addConnectionHandler(handleConnectionChange);

    // Connect to WebSocket if not already connected
    websocketService.connect();

    // Subscribe to chat messages
    unsubscribeRef.current = websocketService.subscribeToChat(chatId, handleMessage);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (connectionUnsubscribeRef.current) {
        connectionUnsubscribeRef.current();
        connectionUnsubscribeRef.current = null;
      }
    };
  }, [chatId, isInitialized, handleMessage, handleConnectionChange]);

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!chatId || isLoading || messages.length === 0) return;

    setIsLoading(true);
    try {
      const oldestMessage = messages[0];
      const response = await chatOperations.getMessages(
        chatId,
        oldestMessage.ts,
        PAGE_SIZE
      );

      const olderMessages = response.getMessages || [];
      
      setMessages(prev => [...olderMessages, ...prev]);
      setHasMore(olderMessages.length === PAGE_SIZE);
      
      // Update cache with new messages
      const allMessages = [...olderMessages, ...messages];
      messageStorage.setChatMessages(chatId, allMessages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more messages';
      setError(errorMessage);
      console.error('Error loading more messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, hasMore, isLoading, messages]);

  // Send a message
  const sendMessage = useCallback(async (content: string, senderId?: string) => {
    if (!chatId || !content.trim()) return;

    const trimmedContent = content.trim();
    const tempMessage: ChatMessage = {
      chatId,
      content: trimmedContent,
      senderId: senderId || 'current-user',
      ts: new Date().toISOString(),
      status: 'sending',
    };

    // Optimistically add to UI
    setMessages(prev => [...prev, tempMessage]);

    try {
      if (isConnected) {
        await chatOperations.sendMessage(chatId, trimmedContent);
        // Remove the temp message - real message will come via WebSocket
        setMessages(prev => prev.filter(m => m.ts !== tempMessage.ts));
      } else {
        // Store in outbox for later sending
        messageStorage.addOutboxMessage(tempMessage);
        // Update status to failed to indicate offline
        setMessages(prev => prev.map(m => 
          m.ts === tempMessage.ts ? { ...m, status: 'failed' } : m
        ));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      if (error instanceof GraphQLError) {
        if (error.isToxicityWarning) {
          setError('Keep it civil');
          setMessages(prev => prev.filter(m => m.ts !== tempMessage.ts));
        } else if (error.isBanned || error.isMuted || error.isReadOnly) {
          const errorMsg = error.isBanned ? 'You are banned' : 
                          error.isMuted ? 'You are muted for 24h' : 
                          'You are temporarily read-only';
          setError(errorMsg);
          setMessages(prev => prev.filter(m => m.ts !== tempMessage.ts));
        } else {
          // Store in outbox for retry
          messageStorage.addOutboxMessage(tempMessage);
          setMessages(prev => prev.map(m => 
            m.ts === tempMessage.ts ? { ...m, status: 'failed' } : m
          ));
        }
      } else {
        // Store in outbox for retry
        messageStorage.addOutboxMessage(tempMessage);
        setMessages(prev => prev.map(m => 
          m.ts === tempMessage.ts ? { ...m, status: 'failed' } : m
        ));
      }
    }
  }, [chatId, isConnected]);

  // Message manipulation functions
  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    if (chatId) {
      messageStorage.appendMessage(chatId, message);
    }
  }, [chatId]);

  const updateMessage = useCallback((messageTs: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.ts === messageTs ? { ...msg, ...updates } : msg
    ));
    if (chatId) {
      messageStorage.updateMessage(chatId, messageTs, updates);
    }
  }, [chatId]);

  const removeMessage = useCallback((messageTs: string) => {
    setMessages(prev => prev.filter(msg => msg.ts !== messageTs));
    if (chatId) {
      messageStorage.removeMessage(chatId, messageTs);
    }
  }, [chatId]);

  // Retry failed operations
  const retry = useCallback(() => {
    setError(null);
    if (chatId && isConnected) {
      flushOutbox();
    }
  }, [chatId, isConnected, flushOutbox]);

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
