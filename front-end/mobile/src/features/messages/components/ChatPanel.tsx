import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme/index';
import { chatOperations } from '@services/graphqlClient';
import { apiFetch, ApiError } from '@services/apiClient';
import { MESSAGES_URL } from '@env';
import { LoadingSpinner } from '@components/index';
import useChat from '@hooks/useChat';
import useMultiChat, { globalShardFor } from '@hooks/useMultiChat';
import ChatMessage from './ChatMessage';
import MentionInput from './MentionInput';
import FriendsPanel from './FriendsPanel';

interface ChatPanelProps {
  chatId?: string | null;
  userId: string;
  globalIds?: string[];
  friendIds?: string[];
  initialTab?: string | null;
  initialDirectId?: string | null;
  restriction?: {
    status: 'NONE' | 'MUTED' | 'BANNED' | 'READONLY';
    remaining?: number;
  } | null;
}

interface Member {
  name: string;
  tag: string;
}

interface PlayerInfo {
  name: string;
  tag: string;
  icon?: string;
}

type TabType = 'Clan' | 'Friends' | 'Global';

export default function ChatPanel({
  chatId = null,
  userId,
  globalIds = [],
  friendIds = [],
  initialTab = null,
  initialDirectId = null,
  restriction = null,
}: ChatPanelProps) {
  const { colors } = useTheme();
  const _insets = useSafeAreaInsets();
  
  const [tab, setTab] = useState<TabType>(() => {
    if (initialDirectId) return 'Friends';
    if (initialTab) return initialTab as TabType;
    return chatId ? 'Clan' : 'Global';
  });
  
  const [directChatId, setDirectChatId] = useState<string | null>(initialDirectId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [infoMap, setInfoMap] = useState<Record<string, PlayerInfo>>({});
  const [_infoLoading, setInfoLoading] = useState(true);
  const [clanMembers, setClanMembers] = useState<Member[]>([]);

  const flatListRef = useRef<FlatList>(null);

  // Chat hooks
  const clanChat = useChat(chatId);
  const globalChat = useMultiChat(globalIds);
  const friendChat = useMultiChat(friendIds);
  const directChat = useChat(directChatId);

  // Determine current chat
  const current = 
    tab === 'Clan' ? clanChat :
    tab === 'Global' ? globalChat :
    directChatId ? directChat : friendChat;

  const { messages, isLoading, isConnected, error, sendMessage, retry, loadMore, hasMore } = current;

  const loadingMoreRef = useRef(false);
  const [serverRestriction, setServerRestriction] = useState<{
    status: 'NONE' | 'MUTED' | 'BANNED' | 'READONLY';
    remaining?: number;
  } | null>(null);

  // Load player info for message senders
  useEffect(() => {
    let ignore = false;

    const loadInfo = async () => {
      if (messages.length === 0) {
        setInfoLoading(false);
        return;
      }

      const senderIds = [...new Set(messages.map(m => m.senderId).filter(Boolean))];
      const missing = senderIds.filter(id => !infoMap[id]);
      
      if (missing.length === 0) {
        setInfoLoading(false);
        return;
      }

      setInfoLoading(true);

      try {
        const fetched = await Promise.all(
          missing.map(async (id) => {
            const isPlayerTag = id.startsWith('#');
            // Use clash-data service as the primary and only endpoint
            const path = isPlayerTag
              ? `/api/v1/clan-data/players/${encodeURIComponent(id)}`
              : `/api/v1/clan-data/players/by-user/${encodeURIComponent(id)}`;

            try {
              const data = await apiFetch<any>(path, { auth: true });
              return { id, data };
            } catch (err) {
              if (err instanceof ApiError && err.isNotFound) {
                console.warn(`User not found for ${id}, showing as Unknown User`);
                return { 
                  id, 
                  data: { 
                    name: 'Unknown User', 
                    tag: isPlayerTag ? id : `#${id}`,
                    // Provide minimal fallback data for display
                    townHallLevel: 0,
                    trophies: 0,
                    donations: 0,
                    donationsReceived: 0,
                  }
                };
              }
              console.error(`Failed to fetch info for ${id}:`, err);
              return { id, data: null };
            }
          })
        );

        if (!ignore) {
          const updated = { ...infoMap };
          fetched.forEach(({ id, data }) => {
            if (data) {
              updated[id] = {
                name: data.name,
                icon: data.leagueIcon,
                tag: data.tag,
              };
            }
          });
          setInfoMap(updated);
        }
      } catch (loadError) {
        console.error('Failed to load player info:', loadError);
      } finally {
        if (!ignore) {
          setInfoLoading(false);
        }
      }
    };

    loadInfo();

    return () => {
      ignore = true;
    };
  }, [messages, infoMap]);

  // Load active chat restriction from messages service
  useEffect(() => {
    let cancelled = false;
    async function loadRestriction() {
      if (!userId) return;
      try {
        const url = `${MESSAGES_URL}/api/v1/chat/restrictions/${encodeURIComponent(userId)}`;
        const data = await apiFetch<{ status: 'NONE' | 'MUTED' | 'BANNED' | 'READONLY'; remaining?: number }>(url, { auth: true });
        if (!cancelled) setServerRestriction(data);
      } catch (err) {
        console.warn('Failed to load chat restriction', err);
        if (!cancelled) setServerRestriction(null);
      }
    }
    loadRestriction();
    return () => { cancelled = true; };
  }, [userId]);

  // Load clan members for mentions
  useEffect(() => {
    let ignore = false;

    const loadClanMembers = async () => {
      if (tab !== 'Clan' || !chatId) {
        setClanMembers([]);
        return;
      }

      try {
        const response = await apiFetch<any[]>(`/api/v1/clan/${encodeURIComponent(chatId)}/members`, {
          auth: true,
        });
        
        if (!ignore) {
          const members = response.map((member: any) => ({
            name: member.name,
            tag: member.tag,
          }));
          setClanMembers(members);
        }
      } catch (loadError) {
        console.error('Failed to load clan members:', loadError);
        if (!ignore) {
          setClanMembers([]);
        }
      }
    };

    loadClanMembers();

    return () => {
      ignore = true;
    };
  }, [tab, chatId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSubmit = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText || sending) return;

    if (tab === 'Clan' && !chatId) return;
    if (tab === 'Friends' && !directChatId) return;

    setSending(true);
    setText('');

    try {
      let targetChatId = chatId;
      
      if (tab === 'Global') {
        targetChatId = globalShardFor(userId);
      } else if (tab === 'Friends') {
        targetChatId = directChatId;
      }

      if (targetChatId) {
        if (tab === 'Global') {
          // In multi-chat mode we cannot send via hook; send directly via GraphQL
          await chatOperations.sendMessage(targetChatId, trimmedText);
        } else {
          // Provide userId for correct optimistic sender identification
          await sendMessage(trimmedText, userId);
        }
      }
    } catch (sendError) {
      console.error('Failed to send message:', sendError);
      setText(trimmedText); // Restore text on error
    } finally {
      setSending(false);
    }
  }, [text, sending, tab, chatId, directChatId, userId, sendMessage]);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  const handleSelectDirectChat = useCallback((selectedChatId: string) => {
    setDirectChatId(selectedChatId);
  }, []);

  const handleBackToFriends = useCallback(() => {
    setDirectChatId(null);
  }, []);

  const renderMessage = ({ item }: { item: any; index: number }) => {
    const sender = item.senderId;
    const info = infoMap[sender];
    const isSelf = sender === userId;

    const retryProps = item.status === 'failed' ? { onRetry: handleRetry } : {};

    return (
      <ChatMessage
        message={item}
        info={info}
        isSelf={isSelf}
        {...retryProps}
      />
    );
  };

  const renderConnectionStatus = () => {
    if (!isConnected) {
      return (
        <View style={[styles.connectionBanner, { backgroundColor: '#f59e0b' }]}>
          <Text style={[styles.connectionText, { color: 'white' }]}>
            Connecting...
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderError = () => {
    if (error) {
      return (
        <View style={[styles.errorBanner, { backgroundColor: '#ef4444' }]}>
          <Text style={[styles.errorText, { color: 'white' }]}>
            {error}
          </Text>
          <Pressable onPress={handleRetry} style={styles.retryButton}>
            <Text style={[styles.retryText, { color: 'white' }]}>
              Retry
            </Text>
          </Pressable>
        </View>
      );
    }
    return null;
  };

  const renderRestrictionBanner = () => {
    const active = serverRestriction || restriction;
    if (!active || active.status === 'NONE') return null;

    const getMessage = () => {
      switch (active.status) {
        case 'BANNED':
          return 'You are banned from chat.';
        case 'MUTED':
          const minutes = Math.ceil((active.remaining || 0) / 60);
          return `You are muted for ${minutes}m`;
        case 'READONLY':
          return 'You are temporarily read-only';
        default:
          return '';
      }
    };

    return (
      <View style={[styles.restrictionBanner, { backgroundColor: '#f59e0b' }]}>
        <Text style={[styles.restrictionText, { color: 'white' }]}>
          {getMessage()}
        </Text>
      </View>
    );
  };

  const renderTabBar = () => (
    <View style={[styles.tabBar, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {['Clan', 'Friends', 'Global'].map((tabName) => (
        <Pressable
          key={tabName}
          onPress={() => setTab(tabName as TabType)}
          style={[
            styles.tab,
            tab === tabName && [styles.activeTab, { borderColor: colors.primary }],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === tabName ? colors.primary : colors.textSecondary },
              tab === tabName && styles.activeTabText,
            ]}
          >
            {tabName}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderChatContent = () => {
    if (tab === 'Friends' && !directChatId) {
      return <FriendsPanel onSelectChat={handleSelectDirectChat} userId={userId} />;
    }

    if (tab === 'Clan' && !chatId) {
      return (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Please join a clan to chat...
          </Text>
        </View>
      );
    }

    return (
      <>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item.ts || index.toString()}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const y = nativeEvent?.contentOffset?.y ?? 0;
            if (y < 100 && hasMore && !loadingMoreRef.current && !isLoading) {
              loadingMoreRef.current = true;
              Promise.resolve(loadMore()).finally(() => {
                loadingMoreRef.current = false;
              });
            }
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {/* TODO: Implement refresh */}}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={() => (
            isLoading ? (
              <View style={styles.loadingHeader}>
                <LoadingSpinner size="small" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading messages...
                </Text>
              </View>
            ) : null
          )}
          ListEmptyComponent={() => (
            !isLoading ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No messages yet
                </Text>
              </View>
            ) : null
          )}
        />
      </>
    );
  };

  const activeRestriction = serverRestriction || restriction;
  const showInput = (tab !== 'Friends' || directChatId) && !(tab === 'Clan' && !chatId);
  const isRestricted = !!activeRestriction && activeRestriction.status !== 'NONE';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderTabBar()}
      {renderConnectionStatus()}
      {renderError()}
      
      {tab === 'Friends' && directChatId && (
        <View style={[styles.directChatHeader, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Pressable onPress={handleBackToFriends} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>
              ← Back
            </Text>
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {renderChatContent()}
        
        {showInput && (
          <>
            {renderRestrictionBanner()}
            {!isRestricted && (
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <MentionInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Type a message..."
                  members={clanMembers}
                  style={styles.textInput}
                />
                <Pressable
                  onPress={handleSubmit}
                  style={[
                    styles.sendButton,
                    { backgroundColor: colors.primary },
                    (!text.trim() || sending) && styles.sendButtonDisabled,
                  ]}
                  disabled={!text.trim() || sending}
                >
                  <Text style={[styles.sendButtonText, { color: colors.surface }]}>
                    {sending ? '...' : 'Send'}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  connectionBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    marginLeft: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  restrictionBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  restrictionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  directChatHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
  },
  loadingHeader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  textInput: {
    flex: 1,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
