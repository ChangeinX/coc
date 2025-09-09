import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  RefreshControl, 
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useThemedStyles, useTheme } from '@theme/index';
import { 
  StatCard, 
  MemberCard, 
  LoadingSpinner, 
  RiskIndicator,
  TownHallIcon,
  RoleIcon,
  DonationIndicator,
  SwipeableSortBar,
  FloatingActionButton,
  MemberCardSkeleton,
  StaggeredList,
  Member,
  SortOption,
  FABAction
} from '@components/index';
import { useDashboardData, useRefreshDashboard } from '../hooks/useDashboard';
import { usePlayerInfo } from '../hooks/usePlayerInfo';
import { useAuthStore } from '@store/auth.store';
import { useFavoritesStore } from '@store/favorites.store';
import { useHaptics } from '@utils/index';
import { useAppState } from '../../../hooks/useAppState';
// Temporarily commented out to fix Apple sign-in: useEntranceAnimation

type SortField = 'loyalty' | 'role' | 'th' | 'trophies' | 'donations' | 'last' | 'risk';
type SortDirection = 'asc' | 'desc';
type ActiveSection = 'health' | 'members' | 'intel';

export default function DashboardScreen() {
  const theme = useTheme();
  const commonStyles = useThemedStyles();
  const { user } = useAuthStore();
  const { light, success, error: errorHaptic, selection, isAvailable } = useHaptics();
  const { favoriteMembers } = useFavoritesStore();
  // Temporarily commented out to fix Apple sign-in: 
  // const { animatedStyle, enter } = useEntranceAnimation();
  
  // Local state  
  const [clanTag, setClanTag] = useState('');
  const [activeSection, setActiveSection] = useState<ActiveSection>('health');
  const [sortField, setSortField] = useState<SortField>('loyalty');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Get player info to find their clan
  const { data: playerInfo } = usePlayerInfo(user?.player_tag);

  // Auto-set clan tag from player's clan
  useEffect(() => {
    if (playerInfo?.clanTag && !clanTag) {
      setClanTag(playerInfo.clanTag);
    }
  }, [playerInfo?.clanTag, clanTag]);

  // Background sync - refresh data when app comes to foreground
  useAppState({
    onForeground: () => {
      if (clanTag && dashboardData) {
        // Only auto-refresh if data is older than 5 minutes
        const lastUpdate = Date.now(); // You'd normally store this in the query cache
        const fiveMinutes = 5 * 60 * 1000;
        // For now, just refresh every time app comes to foreground
        handleRefresh();
      }
    },
  });

  // API hooks
  const {
    data: dashboardData,
    isLoading,
    error,
    isRefetching
  } = useDashboardData(clanTag || null, !!clanTag);
  
  const refreshMutation = useRefreshDashboard();

  // Memoized sorted members
  const sortedMembers = useMemo(() => {
    if (!dashboardData?.members) return [];
    
    const getVal = (m: Member) => {
      switch (sortField) {
        case 'role':
          return m.role || '';
        case 'th':
          return m.townHallLevel;
        case 'trophies':
          return m.trophies;
        case 'donations':
          return m.donations;
        case 'last':
          return m.last_seen ? new Date(m.last_seen).getTime() : 0;
        case 'loyalty':
          return m.loyalty || 0;
        case 'risk':
          return m.risk_score || 0;
        default:
          return 0;
      }
    };

    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...dashboardData.members].sort((a, b) => {
      const v1 = getVal(a);
      const v2 = getVal(b);
      if (v1 < v2) return -1 * dir;
      if (v1 > v2) return 1 * dir;
      return 0;
    });
  }, [dashboardData?.members, sortField, sortDirection]);

  // Handlers

  const handleRefresh = useCallback(async () => {
    if (clanTag) {
      try {
        if (isAvailable()) await light(); // Light haptic on refresh start
        await refreshMutation.mutateAsync(clanTag);
        if (isAvailable()) await success(); // Success haptic when complete
      } catch (error) {
        if (isAvailable()) await errorHaptic(); // Error haptic on failure
        Alert.alert('Error', 'Failed to refresh clan data');
      }
    }
  }, [clanTag, refreshMutation, light, success, errorHaptic, isAvailable]);

  const toggleSort = useCallback(async (field: SortField) => {
    if (isAvailable()) await selection(); // Haptic feedback on sort change
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection, selection, isAvailable]);

  const handleTabChange = useCallback(async (newSection: ActiveSection) => {
    if (isAvailable()) await selection(); // Haptic feedback on tab change
    setActiveSection(newSection);
  }, [selection, isAvailable]);

  // Sort options for swipeable sort bar
  const sortOptions: SortOption[] = [
    { key: 'loyalty', label: 'Loyalty' },
    { key: 'risk', label: 'Risk' },
    { key: 'trophies', label: 'Trophies' },
    { key: 'th', label: 'TH' },
    { key: 'donations', label: 'Donations' },
    { key: 'role', label: 'Role' },
  ];

  const renderMemberItem = ({ item: member }: { item: Member }) => (
    <MemberCard
      member={member}
      onPress={setSelectedMember}
      showRisk={true}
      compact={false}
    />
  );

  const renderTopRiskItem = ({ item: member }: { item: Member }) => (
    <View style={{ width: 280, marginRight: theme.spacing.base }}>
      <MemberCard
        member={member}
        onPress={setSelectedMember}
        showRisk={true}
        compact={true}
      />
    </View>
  );

  // FAB actions
  const fabActions: FABAction[] = [
    {
      id: 'refresh',
      label: 'Refresh',
      icon: '🔄',
      onPress: handleRefresh,
    },
    {
      id: 'favorites',
      label: `Favorites (${favoriteMembers.length})`,
      icon: '❤️',
      onPress: () => {
        // Filter members list to show only favorites
        if (favoriteMembers.length > 0) {
          Alert.alert(
            'Favorites',
            `You have ${favoriteMembers.length} favorite member${favoriteMembers.length === 1 ? '' : 's'}:\n\n${favoriteMembers.map(f => f.name).join('\n')}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('No Favorites', 'You haven\'t added any favorite members yet. Long press on a member card to add them to favorites.');
        }
      },
    },
    {
      id: 'sort-loyalty',
      label: 'Sort by Loyalty',
      icon: '📅',
      onPress: () => {
        setSortField('loyalty');
        setSortDirection('desc');
      },
    },
    {
      id: 'sort-risk',
      label: 'Sort by Risk',
      icon: '⚠️',
      onPress: () => {
        setSortField('risk');
        setSortDirection('desc');
      },
    },
  ];

  // Handle no clan case
  if (!playerInfo?.clanTag && playerInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1, 
            padding: theme.spacing.base,
            justifyContent: 'center',
            gap: theme.spacing.lg 
          }}
        >
          <View style={{
            ...commonStyles.card,
            alignItems: 'center',
            padding: theme.spacing['2xl'],
            gap: theme.spacing.base,
          }}>
            <Text style={{ fontSize: 48 }}>🏰</Text>
            <Text style={{
              ...commonStyles.heading2,
              textAlign: 'center',
            }}>
              No Clan Found
            </Text>
            <Text style={{
              ...commonStyles.bodySecondary,
              textAlign: 'center',
            }}>
              You're not currently in a clan. Join a clan in Clash of Clans to access the dashboard.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Error handling
  if (error) {
    const isNotFound = (error as any)?.status === 404;
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1, 
            padding: theme.spacing.base,
            justifyContent: 'center',
            gap: theme.spacing.lg 
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
          }
        >
          <View style={{
            ...commonStyles.card,
            alignItems: 'center',
            padding: theme.spacing['2xl'],
            gap: theme.spacing.base,
          }}>
            <Text style={{
              fontSize: 48,
              color: theme.colors.error,
            }}>
              ⚠️
            </Text>
            <Text style={{
              ...commonStyles.heading2,
              color: theme.colors.error,
              textAlign: 'center',
            }}>
              {isNotFound ? 'Clan Not Found' : 'Error Loading Clan'}
            </Text>
            <Text style={{
              ...commonStyles.bodySecondary,
              textAlign: 'center',
            }}>
              {isNotFound 
                ? 'We couldn\'t find your clan. Please try refreshing or check if you\'re still in the clan in Clash of Clans.'
                : 'There was an error loading the clan data. Please try again.'
              }
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView 
        contentContainerStyle={{ padding: theme.spacing.base, gap: theme.spacing.lg }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary, theme.colors.success]}
            progressBackgroundColor={theme.colors.surface}
            title="Pull to refresh clan data"
            titleColor={theme.colors.textSecondary}
          />
        }
      >

        {/* Loading State */}
        {isLoading && !dashboardData && (
          <View style={{ gap: theme.spacing.lg }}>
            <LoadingSpinner message="Loading clan data..." />
            
            {/* Skeleton for member cards */}
            <View style={{ gap: theme.spacing.sm }}>
              {[1, 2, 3].map((index) => (
                <MemberCardSkeleton key={index} />
              ))}
            </View>
          </View>
        )}

        {/* Dashboard Content */}
        {dashboardData && (
          <>
            {/* Tabs */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.base,
              padding: theme.spacing.xs,
              ...theme.shadows.sm,
            }}>
              {([
                { key: 'health', label: 'Clan Health' },
                { key: 'members', label: 'Members' },
                { key: 'intel', label: 'Intel' },
              ] as const).map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={{
                    flex: 1,
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.base,
                    borderRadius: theme.borderRadius.sm,
                    backgroundColor: activeSection === tab.key 
                      ? theme.colors.primary 
                      : 'transparent',
                  }}
                  onPress={() => handleTabChange(tab.key)}
                >
                  <Text style={{
                    textAlign: 'center',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: activeSection === tab.key 
                      ? theme.colors.textInverse 
                      : theme.colors.textSecondary,
                  }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Health Section */}
            {activeSection === 'health' && (
              <View style={{ gap: theme.spacing.lg }}>
                {/* Win Streak Highlight */}
                <View style={{ alignItems: 'center' }}>
                  <StatCard
                    label="Win Streak"
                    value={dashboardData.clan.warWinStreak || 0}
                    icon="🏆"
                    size="lg"
                    variant="success"
                  />
                </View>

                {/* Stats Grid */}
                <StaggeredList
                  data={[
                    {
                      id: 'members',
                      iconUrl: dashboardData.clan.badgeUrls?.small,
                      label: 'Members',
                      value: dashboardData.members.length,
                      variant: 'default' as const,
                    },
                    {
                      id: 'level',
                      icon: '⭐',
                      label: 'Level',
                      value: dashboardData.clan.clanLevel,
                      variant: 'default' as const,
                    },
                    {
                      id: 'warWins',
                      icon: '🛡️',
                      label: 'War Wins',
                      value: dashboardData.clan.warWins || 0,
                      variant: 'success' as const,
                    },
                    {
                      id: 'warLosses',
                      icon: '💔',
                      label: 'War Losses',
                      value: dashboardData.clan.warLosses || 0,
                      variant: 'error' as const,
                    },
                  ]}
                  renderItem={({ item, index }) => (
                    <View style={{ 
                      flex: 1, 
                      minWidth: '45%',
                      ...(index % 2 === 1 ? { marginLeft: theme.spacing.md } : {}),
                    }}>
                      <StatCard
                        {...item}
                        size="sm"
                      />
                    </View>
                  )}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  animationType="scaleIn"
                  staggerDelay={100}
                  contentContainerStyle={{ 
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: theme.spacing.md,
                  }}
                />
              </View>
            )}

            {/* Members Section */}
            {activeSection === 'members' && (
              <View style={{ gap: theme.spacing.lg }}>
                {/* Top 5 At-Risk Members */}
                {dashboardData.topRisk.length > 0 && (
                  <View>
                    <Text style={{
                      ...commonStyles.heading2,
                      marginBottom: theme.spacing.base,
                    }}>
                      Top 5 At-Risk Members
                    </Text>
                    <FlatList
                      data={dashboardData.topRisk}
                      renderItem={renderTopRiskItem}
                      keyExtractor={(item) => item.tag}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: theme.spacing.base }}
                    />
                  </View>
                )}

                {/* Enhanced Sort Controls */}
                <SwipeableSortBar
                  options={sortOptions}
                  activeSort={sortField}
                  sortDirection={sortDirection}
                  onSortChange={(key) => toggleSort(key as SortField)}
                />

                {/* Members List */}
                <Text style={{
                  ...commonStyles.heading2,
                  marginBottom: theme.spacing.base,
                }}>
                  All Members ({sortedMembers.length})
                </Text>

                <StaggeredList
                  data={sortedMembers}
                  renderItem={renderMemberItem}
                  keyExtractor={(item) => item.tag}
                  scrollEnabled={false}
                  animationType="slideUp"
                  staggerDelay={50}
                  contentContainerStyle={{ gap: theme.spacing.sm }}
                />
              </View>
            )}

            {/* Intel Section (Coming Soon) */}
            {activeSection === 'intel' && (
              <View style={{
                ...commonStyles.card,
                alignItems: 'center',
                padding: theme.spacing['2xl'],
                gap: theme.spacing.base,
              }}>
                <Text style={{ fontSize: 48 }}>🔍</Text>
                <Text style={{
                  ...commonStyles.heading2,
                  textAlign: 'center',
                }}>
                  Intel Coming Soon
                </Text>
                <Text style={{
                  ...commonStyles.bodySecondary,
                  textAlign: 'center',
                }}>
                  Advanced analytics and insights will be available here.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
      
      {/* Floating Action Button */}
      {dashboardData && (
        <FloatingActionButton actions={fabActions} />
      )}
    </View>
  );
}
