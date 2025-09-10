import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useTheme } from '@theme/index';
import { chatOperations } from '@services/graphqlClient';
import { useAuthStore } from '@store/auth.store';
import { apiFetch, ApiError } from '@services/apiClient';
import { AUTH_URL } from '@env';
import { LoadingSpinner } from '@components/index';

interface Friend {
  id: string;
  name: string;
  tag: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  userSub?: string;
}

interface FriendsPanelProps {
  onSelectChat: (chatId: string) => void;
  userId?: string;
}

export default function FriendsPanel({ onSelectChat, userId }: FriendsPanelProps) {
  const { colors, typography } = useTheme();
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Generate direct chat ID from two user IDs
  const generateDirectChatId = useCallback((currentUserId: string, otherUserId: string) => {
    const sortedIds = [currentUserId, otherUserId].sort();
    return `direct#${sortedIds[0]}#${sortedIds[1]}`;
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      setError(null);
      if (!user?.sub) {
        setFriends([]);
        return;
      }

      type FriendDto = { userId: string; playerTag: string; since: string };
      const url = `${AUTH_URL}/api/v1/friends/list?sub=${encodeURIComponent(user.sub)}`;
      const list = await apiFetch<FriendDto[]>(url, { auth: true });

      // Fetch player names for tags
      const friendEntries: Friend[] = await Promise.all(
        list.map(async (f) => {
          const chatId = generateDirectChatId(user.sub!, f.userId);
          let name = f.playerTag;
          try {
            // Use clash-data service as the primary endpoint
            const playerData = await apiFetch<any>(`/api/v1/clan-data/players/${encodeURIComponent(f.playerTag)}`, { auth: true });
            name = playerData?.name || name;
          } catch (err) {
            console.warn(`Failed to fetch player name for ${f.playerTag}, using tag as name`);
            // Keep the default name as the playerTag
          }
          return {
            id: chatId,
            name,
            tag: f.playerTag,
            isOnline: false,
            unreadCount: 0,
            userSub: f.userId,
          } as Friend;
        })
      );

      setFriends(friendEntries);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load friends';
      setError(errorMessage);
      console.error('Error loading friends:', err);
    }
  }, [generateDirectChatId, user?.sub]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadFriends();
      setIsLoading(false);
    };

    loadData();
  }, [loadFriends]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadFriends();
    setIsRefreshing(false);
  }, [loadFriends]);

  const handleFriendPress = useCallback((friend: Friend) => {
    onSelectChat(friend.id);
  }, [onSelectChat]);

  const handleAddFriend = useCallback(() => {
    setShowAddFriend(true);
  }, []);

  const handleSearchFriend = useCallback(async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a player tag or name');
      return;
    }

    try {
      // This would normally search for players and create a friend request
      // For now, we'll just create a mock direct chat
      const mockFriend: Friend = {
        id: generateDirectChatId(userId || 'current', searchQuery),
        name: searchQuery,
        tag: searchQuery.startsWith('#') ? searchQuery : `#${searchQuery.toUpperCase()}`,
        unreadCount: 0,
        isOnline: false,
      };

      setFriends(prev => [mockFriend, ...prev]);
      setShowAddFriend(false);
      setSearchQuery('');
      
      Alert.alert('Success', 'Friend added!');
    } catch (err) {
      Alert.alert('Error', 'Failed to add friend');
    }
  }, [searchQuery, generateDirectChatId, userId]);

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <Pressable
      style={[styles.friendItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => handleFriendPress(item)}
      android_ripple={{ color: colors.primary + '20' }}
    >
      <View style={styles.friendAvatar}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.surface }]}>
            {item.name[0].toUpperCase()}
          </Text>
        </View>
        {item.isOnline && (
          <View style={[styles.onlineIndicator, { backgroundColor: '#10b981' }]} />
        )}
      </View>
      
      <View style={styles.friendInfo}>
        <View style={styles.friendHeader}>
          <Text style={[styles.friendName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.friendTag, { color: colors.textSecondary }]}>
            {item.tag}
          </Text>
        </View>
        
        {item.lastMessage && (
          <Text
            style={[styles.lastMessage, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
        )}
      </View>
      
      <View style={styles.friendMeta}>
        {item.lastMessageTime && (
          <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
            {formatTime(item.lastMessageTime)}
          </Text>
        )}
        
        {item.unreadCount && item.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.unreadText, { color: colors.surface }]}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        No friends yet
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        Add friends to start chatting
      </Text>
      <Pressable
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={handleAddFriend}
      >
        <Text style={[styles.addButtonText, { color: colors.surface }]}>
          Add Friend
        </Text>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading friends...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => handleRefresh()}
        >
          <Text style={[styles.retryButtonText, { color: colors.surface }]}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Friends
        </Text>
        <Pressable
          style={[styles.headerButton, { backgroundColor: colors.primary }]}
          onPress={handleAddFriend}
        >
          <Text style={[styles.headerButtonText, { color: colors.surface }]}>
            +
          </Text>
        </Pressable>
      </View>
      
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={friends.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showAddFriend}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddFriend(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.addFriendModal, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add Friend
            </Text>
            
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter player tag or name"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowAddFriend(false);
                  setSearchQuery('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSearchFriend}
              >
                <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                  Add
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  friendAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  friendInfo: {
    flex: 1,
    marginRight: 8,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  friendTag: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 18,
  },
  friendMeta: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 4,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFriendModal: {
    width: '80%',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
