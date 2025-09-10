import { MMKV } from 'react-native-mmkv';
import { ChatMessage } from '../websocketClient';

interface CachedChat {
  chatId: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

interface OutboxMessage extends ChatMessage {
  id: string;
  retryCount: number;
  lastAttempt: string;
}

class MessageStorage {
  private storage = new MMKV({
    id: 'messages',
    encryptionKey: 'message-cache-key',
  });

  private outboxStorage = new MMKV({
    id: 'outbox',
    encryptionKey: 'outbox-cache-key',
  });

  private readonly CACHE_LIMIT = 50;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly CACHE_EXPIRY_HOURS = 24;

  // Message cache operations
  getChatMessages(chatId: string): ChatMessage[] {
    try {
      const cached = this.storage.getString(`chat_${chatId}`);
      if (!cached) return [];

      const data: CachedChat = JSON.parse(cached);
      
      // Check if cache is expired
      const lastUpdated = new Date(data.lastUpdated);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > this.CACHE_EXPIRY_HOURS) {
        this.storage.delete(`chat_${chatId}`);
        return [];
      }

      return data.messages || [];
    } catch (error) {
      console.error('Failed to get cached messages:', error);
      return [];
    }
  }

  setChatMessages(chatId: string, messages: ChatMessage[]): void {
    try {
      // Limit the number of cached messages
      const limitedMessages = messages.slice(-this.CACHE_LIMIT);
      
      const cached: CachedChat = {
        chatId,
        messages: limitedMessages,
        lastUpdated: new Date().toISOString(),
      };

      this.storage.set(`chat_${chatId}`, JSON.stringify(cached));
    } catch (error) {
      console.error('Failed to cache messages:', error);
    }
  }

  appendMessage(chatId: string, message: ChatMessage): void {
    const existing = this.getChatMessages(chatId);
    
    // Avoid duplicates
    const isDuplicate = existing.some(m => 
      m.ts === message.ts && m.senderId === message.senderId
    );
    
    if (!isDuplicate) {
      const updated = [...existing, message];
      this.setChatMessages(chatId, updated);
    }
  }

  updateMessage(chatId: string, messageTs: string, updates: Partial<ChatMessage>): void {
    const messages = this.getChatMessages(chatId);
    const updatedMessages = messages.map(msg => 
      msg.ts === messageTs ? { ...msg, ...updates } : msg
    );
    this.setChatMessages(chatId, updatedMessages);
  }

  removeMessage(chatId: string, messageTs: string): void {
    const messages = this.getChatMessages(chatId);
    const filteredMessages = messages.filter(msg => msg.ts !== messageTs);
    this.setChatMessages(chatId, filteredMessages);
  }

  clearChatCache(chatId: string): void {
    this.storage.delete(`chat_${chatId}`);
  }

  clearAllCache(): void {
    this.storage.clearAll();
  }

  // Outbox operations for offline message queue
  addOutboxMessage(message: ChatMessage): void {
    try {
      const outboxMessage: OutboxMessage = {
        ...message,
        id: `${message.chatId}_${message.ts}_${Date.now()}`,
        retryCount: 0,
        lastAttempt: new Date().toISOString(),
      };

      this.outboxStorage.set(outboxMessage.id, JSON.stringify(outboxMessage));
    } catch (error) {
      console.error('Failed to add outbox message:', error);
    }
  }

  getOutboxMessages(chatId?: string): OutboxMessage[] {
    try {
      const keys = this.outboxStorage.getAllKeys();
      const messages: OutboxMessage[] = [];

      for (const key of keys) {
        const stored = this.outboxStorage.getString(key);
        if (stored) {
          const message: OutboxMessage = JSON.parse(stored);
          if (!chatId || message.chatId === chatId) {
            messages.push(message);
          }
        }
      }

      // Sort by timestamp
      return messages.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    } catch (error) {
      console.error('Failed to get outbox messages:', error);
      return [];
    }
  }

  updateOutboxMessage(messageId: string, updates: Partial<OutboxMessage>): void {
    try {
      const stored = this.outboxStorage.getString(messageId);
      if (stored) {
        const message: OutboxMessage = JSON.parse(stored);
        const updated = { ...message, ...updates };
        this.outboxStorage.set(messageId, JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Failed to update outbox message:', error);
    }
  }

  removeOutboxMessage(messageId: string): void {
    this.outboxStorage.delete(messageId);
  }

  clearOutbox(): void {
    this.outboxStorage.clearAll();
  }

  // Utility methods
  getStorageInfo(): {
    cacheSize: number;
    outboxSize: number;
    totalKeys: number;
  } {
    return {
      cacheSize: this.storage.getAllKeys().length,
      outboxSize: this.outboxStorage.getAllKeys().length,
      totalKeys: this.storage.getAllKeys().length + this.outboxStorage.getAllKeys().length,
    };
  }

  pruneOldMessages(): void {
    const keys = this.storage.getAllKeys();
    const now = new Date();

    for (const key of keys) {
      if (key.startsWith('chat_')) {
        try {
          const stored = this.storage.getString(key);
          if (stored) {
            const data: CachedChat = JSON.parse(stored);
            const lastUpdated = new Date(data.lastUpdated);
            const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff > this.CACHE_EXPIRY_HOURS) {
              this.storage.delete(key);
            }
          }
        } catch (error) {
          // If we can't parse it, delete it
          this.storage.delete(key);
        }
      }
    }
  }

  pruneFailedOutboxMessages(): void {
    const messages = this.getOutboxMessages();
    
    for (const message of messages) {
      if (message.retryCount >= this.MAX_RETRY_COUNT) {
        this.removeOutboxMessage(message.id);
      }
    }
  }
}

export const messageStorage = new MessageStorage();