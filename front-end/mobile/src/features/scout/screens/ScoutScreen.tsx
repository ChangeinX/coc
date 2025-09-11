import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '@theme/index';
import { FloatingActionButton, FABAction } from '@components/FloatingActionButton';
import { 
  RecruitFeed, 
  PlayerRecruitFeed, 
  DiscoveryBar, 
  ClanPostForm,
} from '../components';
import { useRecruitFeed, usePlayerRecruitFeed } from '../hooks';
import { createPlayerRecruitPost } from '../api/recruitingApi';

type TabType = 'find' | 'need';

export default function ScoutScreen() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('find');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const recruitFeed = useRecruitFeed({ searchQuery: activeTab === 'find' ? searchQuery : '' });
  const playerFeed = usePlayerRecruitFeed({ searchQuery: activeTab === 'need' ? searchQuery : '' });

  const handlePostPress = (post: any) => {
    console.log('Pressed post:', post);
  };

  const handleJoinPress = async (post: any) => {
    try {
      await recruitFeed.joinClan(post.id);
      Alert.alert('Success', 'Join request sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to join clan. Please try again.');
    }
  };

  const handleInvitePress = (post: any) => {
    Alert.alert(
      'Invite Player', 
      `Send clan invitation to ${post.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Invite', 
          onPress: () => {
            Alert.alert('Success', 'Invitation sent!');
          }
        }
      ]
    );
  };

  const handleCreatePost = async (data: { description: string }) => {
    try {
      await playerFeed.createPost(data);
      setShowCreateForm(false);
      Alert.alert('Success', 'Your recruit post has been created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const fabActions: FABAction[] = [
    {
      id: 'create-post',
      label: 'Create Player Post',
      icon: '✏️',
      onPress: () => setShowCreateForm(true),
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    activeTabText: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });

  if (showCreateForm) {
    return (
      <View style={styles.container}>
        <ClanPostForm
          onSubmit={async ({ callToAction }) => {
            await handleCreatePost({ description: callToAction });
          }}
          onCancel={() => setShowCreateForm(false)}
          isLoading={playerFeed.isCreating}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'find' && styles.activeTab]}
          onPress={() => setActiveTab('find')}
        >
          <Text style={[styles.tabText, activeTab === 'find' && styles.activeTabText]}>
            Find a Clan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'need' && styles.activeTab]}
          onPress={() => setActiveTab('need')}
        >
          <Text style={[styles.tabText, activeTab === 'need' && styles.activeTabText]}>
            Need a Clan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <DiscoveryBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={activeTab === 'find' ? 'Search clans...' : 'Search players...'}
      />

      {/* Content */}
      {activeTab === 'find' ? (
        <RecruitFeed
          posts={recruitFeed.posts}
          onPostPress={handlePostPress}
          onJoinPress={handleJoinPress}
          onLoadMore={recruitFeed.fetchNextPage}
          onRefresh={recruitFeed.refetch}
          isLoading={recruitFeed.isLoading}
          isLoadingMore={recruitFeed.isFetchingNextPage}
          isRefreshing={recruitFeed.isRefetching}
          hasMore={recruitFeed.hasNextPage}
        />
      ) : (
        <>
          <PlayerRecruitFeed
            posts={playerFeed.posts}
            onPostPress={handlePostPress}
            onInvitePress={handleInvitePress}
            onLoadMore={playerFeed.fetchNextPage}
            onRefresh={playerFeed.refetch}
            isLoading={playerFeed.isLoading}
            isLoadingMore={playerFeed.isFetchingNextPage}
            isRefreshing={playerFeed.isRefetching}
            hasMore={playerFeed.hasNextPage}
          />
          <FloatingActionButton actions={fabActions} />
        </>
      )}
    </View>
  );
}

