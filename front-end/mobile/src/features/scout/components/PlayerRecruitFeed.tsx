import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '@theme/index';
import { LoadingSpinner } from '@components/LoadingSpinner';
import { PlayerRecruitCard } from './PlayerRecruitCard';
import type { PlayerRecruitPost } from '../api/recruitingApi';

interface PlayerRecruitFeedProps {
  posts: PlayerRecruitPost[];
  onPostPress: (post: PlayerRecruitPost) => void;
  onInvitePress: (post: PlayerRecruitPost) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
}

export function PlayerRecruitFeed({
  posts,
  onPostPress,
  onInvitePress,
  onLoadMore,
  onRefresh,
  isLoading,
  isLoadingMore,
  isRefreshing,
  hasMore,
}: PlayerRecruitFeedProps) {
  const theme = useTheme();

  const handleEndReached = () => {
    if (hasMore && !isLoadingMore) {
      onLoadMore();
    }
  };

  const renderItem = ({ item }: { item: PlayerRecruitPost }) => (
    <PlayerRecruitCard
      post={item}
      onPress={onPostPress}
      onInvite={onInvitePress}
    />
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View testID="load-more-indicator" style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.loadMoreText, { color: theme.colors.textSecondary }]}>
          Loading more...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View testID="loading-indicator" style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          No players found
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Check back later for new player posts
        </Text>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadMoreContainer: {
      padding: 16,
      alignItems: 'center',
    },
    loadMoreText: {
      fontSize: 12,
      marginTop: 8,
    },
  });

  return (
    <View style={styles.container}>
      <FlatList
        testID="player-recruit-feed-list"
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={posts.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}