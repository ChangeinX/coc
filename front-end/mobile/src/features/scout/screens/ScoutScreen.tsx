import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '@theme/index';
import { FloatingActionButton, FABAction } from '@components/FloatingActionButton';
import { 
  RecruitFeed, 
  PlayerRecruitFeed, 
  DiscoveryBar, 
  ClanPostForm,
  PlayerPostForm,
} from '../components';
import { useRecruitFeed, usePlayerRecruitFeed } from '../hooks';
import { createRecruitPost } from '../api/recruitingApi';
import { useAuthStore } from '@store/auth.store';
import { usePlayerInfo } from '@features/dashboard/hooks/usePlayerInfo';

type TabType = 'find' | 'need';
type FormType = 'clan' | 'player' | null;

export default function ScoutScreen() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('find');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState<FormType>(null);
  
  const { user } = useAuthStore();
  const playerInfo = usePlayerInfo(user?.player_tag);
  
  const recruitFeed = useRecruitFeed({ searchQuery: activeTab === 'find' ? searchQuery : '' });
  const playerFeed = usePlayerRecruitFeed({ searchQuery: activeTab === 'need' ? searchQuery : '' });
  
  // Check if user can create clan posts (leader or co-leader)
  const canCreateClanPost = playerInfo.data?.role === 'leader' || playerInfo.data?.role === 'coLeader';

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

  const handleCreatePlayerPost = async (data: { description: string }) => {
    try {
      await playerFeed.createPost(data);
      setShowCreateForm(null);
      Alert.alert('Success', 'Your recruit post has been created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const handleCreateClanPost = async (data: { clanTag: string; callToAction: string }) => {
    try {
      await createRecruitPost(data.clanTag, data.callToAction);
      setShowCreateForm(null);
      Alert.alert('Success', 'Your clan post has been created!');
      // Refresh the recruit feed to show the new post
      recruitFeed.refetch();
    } catch (error) {
      Alert.alert('Error', 'Failed to create clan post. Please try again.');
    }
  };

  // Generate FAB actions based on current tab and user permissions
  const getFABActions = (): FABAction[] => {
    const actions: FABAction[] = [];
    
    if (activeTab === 'find' && canCreateClanPost) {
      actions.push({
        id: 'create-clan-post',
        label: 'Create Clan Post',
        icon: '🏰',
        onPress: () => setShowCreateForm('clan'),
      });
    }
    
    if (activeTab === 'need') {
      actions.push({
        id: 'create-player-post',
        label: 'Create Player Post',
        icon: '✏️',
        onPress: () => setShowCreateForm('player'),
      });
    }
    
    return actions;
  };

  const fabActions = getFABActions();

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

  if (showCreateForm === 'clan') {
    return (
      <View style={styles.container}>
        <ClanPostForm
          onSubmit={handleCreateClanPost}
          onCancel={() => setShowCreateForm(null)}
          isLoading={false} // TODO: Add loading state for clan post creation
          {...(playerInfo.data?.clanTag && { clanTag: playerInfo.data.clanTag })}
        />
      </View>
    );
  }

  if (showCreateForm === 'player') {
    return (
      <View style={styles.container}>
        <PlayerPostForm
          onSubmit={handleCreatePlayerPost}
          onCancel={() => setShowCreateForm(null)}
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
        <>
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
          {fabActions.length > 0 && <FloatingActionButton actions={fabActions} />}
        </>
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
          {fabActions.length > 0 && <FloatingActionButton actions={fabActions} />}
        </>
      )}
    </View>
  );
}

