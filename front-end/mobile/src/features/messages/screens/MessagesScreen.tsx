import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@theme/index';
import { useAuthStore } from '@store/auth.store';
import { chatOperations } from '@services/graphqlClient';
import { websocketService } from '@services/websocketClient';
import { LoadingSpinner } from '@components/index';
import ChatPanel from '../components/ChatPanel';

export default function MessagesScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [globalIds, setGlobalIds] = useState<string[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mock user restrictions - this would come from user context
  const [restriction] = useState<{
    status: 'NONE' | 'MUTED' | 'BANNED' | 'READONLY';
    remaining?: number;
  }>({ status: 'NONE' });

  useEffect(() => {
    const loadChats = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        
        // Connect to WebSocket
        await websocketService.connect();
        
        // Load available chats
        const response = await chatOperations.listChats();
        const chats = response.listChats;
        
        const globals = chats.filter(chat => chat.kind === 'GLOBAL').map(chat => chat.id);
        const directs = chats.filter(chat => chat.kind === 'DIRECT').map(chat => chat.id);
        
        setGlobalIds(globals);
        setFriendIds(directs);
        
        console.log('Loaded chats:', { globals: globals.length, directs: directs.length });
      } catch (err) {
        console.error('Failed to load chats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chats');
      } finally {
        setIsLoading(false);
      }
    };

    loadChats();

    // Cleanup WebSocket on unmount
    return () => {
      websocketService.cleanup();
    };
  }, [user?.id]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        {/* TODO: Add error component */}
      </View>
    );
  }

  if (!user?.id) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        {/* TODO: Add login required component */}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ChatPanel
        chatId={null}
        userId={user.id}
        globalIds={globalIds}
        friendIds={friendIds}
        restriction={restriction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
