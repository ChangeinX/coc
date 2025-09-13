import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AppState, AppStateStatus } from 'react-native';
import { API_URL } from '@env';
import { tokenStorage } from './storage/secureStorage';

export interface ChatMessage {
  id?: string;
  chatId: string;
  ts: string;
  senderId: string;
  content: string;
  status?: 'sending' | 'sent' | 'failed';
}

export interface WebSocketSubscription {
  chatId: string;
  subscription: any;
}

export type MessageHandler = (message: ChatMessage) => void;
export type ConnectionHandler = (connected: boolean) => void;

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, any> = new Map();
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private appStateSubscription: any = null;

  constructor() {
    this.setupAppStateListener();
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    if (nextAppState === 'active' && !this.isConnected) {
      // App came to foreground, try to reconnect
      this.connect();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background, disconnect to save resources
      this.disconnect();
    }
  }

  async connect(): Promise<void> {
    if (this.client?.connected) {
      return;
    }

    try {
      const tokens = await tokenStorage.get();
      if (!tokens?.accessToken) {
        console.warn('No access token available for WebSocket connection');
        return;
      }

      const baseUrl = API_URL;
      
      this.client = new Client({
        webSocketFactory: () => new SockJS(`${baseUrl}/api/v1/chat/socket`),
        connectHeaders: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        debug: (str) => {
          console.log('STOMP:', str);
        },
        onConnect: (frame) => {
          console.log('WebSocket connected:', frame);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(true);
          this.resubscribeAll();
        },
        onDisconnect: (frame) => {
          console.log('WebSocket disconnected:', frame);
          this.isConnected = false;
          this.notifyConnectionHandlers(false);
        },
        onStompError: (frame) => {
          console.error('STOMP error:', frame.headers.message, frame.body);
          this.handleReconnect();
        },
        onWebSocketError: (event) => {
          console.error('WebSocket error:', event);
          this.handleReconnect();
        },
        onWebSocketClose: (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.notifyConnectionHandlers(false);
          this.handleReconnect();
        },
        heartbeatIncoming: 30000,
        heartbeatOutgoing: 30000,
        reconnectDelay: 0, // We handle reconnection manually
      });

      this.client.activate();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.subscriptions.clear();
    this.isConnected = false;
    this.notifyConnectionHandlers(false);
  }

  subscribeToChat(chatId: string, handler: MessageHandler): () => void {
    if (!chatId) {
      console.warn('Cannot subscribe to empty chatId');
      return () => {};
    }

    // Store the handler
    this.messageHandlers.set(chatId, handler);

    // If client is connected, subscribe immediately
    if (this.client?.connected) {
      this.performSubscription(chatId);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribeFromChat(chatId);
    };
  }

  private performSubscription(chatId: string) {
    if (!this.client?.connected) {
      return;
    }

    // Unsubscribe existing subscription if any
    const existingSubscription = this.subscriptions.get(chatId);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
    }

    const subscription = this.client.subscribe(
      `/topic/chat/${chatId}`,
      (message: IMessage) => {
        try {
          const chatMessage: ChatMessage = JSON.parse(message.body);
          const handler = this.messageHandlers.get(chatId);
          if (handler) {
            handler(chatMessage);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      }
    );

    this.subscriptions.set(chatId, subscription);
    console.log(`Subscribed to chat: ${chatId}`);
  }

  private resubscribeAll() {
    // Resubscribe to all chats when reconnected
    for (const chatId of this.messageHandlers.keys()) {
      this.performSubscription(chatId);
    }
  }

  unsubscribeFromChat(chatId: string): void {
    const subscription = this.subscriptions.get(chatId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(chatId);
    }
    this.messageHandlers.delete(chatId);
    console.log(`Unsubscribed from chat: ${chatId}`);
  }

  addConnectionHandler(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    // Immediately notify of current connection status
    handler(this.isConnected);
    
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  cleanup(): void {
    this.disconnect();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
